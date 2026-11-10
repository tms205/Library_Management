package com.librarymanagement.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import com.librarymanagement.dto.response.BorrowResponse;
import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.Book;
import com.librarymanagement.entity.BorrowRecord;
import com.librarymanagement.entity.BorrowStatus;
import com.librarymanagement.entity.Member;
import com.librarymanagement.event.ReturnRequestedEvent;
import com.librarymanagement.exception.BadRequestException;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.repository.BookRepository;
import com.librarymanagement.repository.BorrowCriteriaRepository;
import com.librarymanagement.repository.BorrowRecordRepository;
import com.librarymanagement.repository.MemberRepository;

class BorrowServiceTest {

	private BorrowRecordRepository borrowRecordRepository;
	private MemberRepository memberRepository;
	private BookRepository bookRepository;
	private BorrowCriteriaRepository borrowCriteriaRepository;
	private AccountRepository accountRepository;
	private NotificationService notificationService;
	private ApplicationEventPublisher eventPublisher;

	private BorrowService borrowService;

	private Member mockMember;
	private Book mockBook;
	private BorrowRecord mockRecord;
	private Account mockStaff;

	@BeforeEach
	void setUp() {
		borrowRecordRepository = mock(BorrowRecordRepository.class);
		memberRepository = mock(MemberRepository.class);
		bookRepository = mock(BookRepository.class);
		borrowCriteriaRepository = mock(BorrowCriteriaRepository.class);
		accountRepository = mock(AccountRepository.class);
		notificationService = mock(NotificationService.class);
		eventPublisher = mock(ApplicationEventPublisher.class);

		borrowService = new BorrowService(
				borrowRecordRepository,
				memberRepository,
				bookRepository,
				borrowCriteriaRepository,
				accountRepository,
				notificationService,
				eventPublisher
		);

		Account readerAccount = new Account();
		readerAccount.setId(10L);
		readerAccount.setEmail("reader@library.com");
		readerAccount.setEnabled(true);

		mockMember = new Member();
		mockMember.setId(10L);
		mockMember.setAccount(readerAccount);
		mockMember.setFullName("Nguyen Van Reader");

		mockBook = new Book();
		mockBook.setId(100L);
		mockBook.setTitle("Lập trình Java cơ bản");

		mockRecord = new BorrowRecord();
		mockRecord.setId(1L);
		mockRecord.setMember(mockMember);
		mockRecord.setBook(mockBook);
		mockRecord.setStatus(BorrowStatus.BORROWED);

		mockStaff = new Account();
		mockStaff.setId(99L);
		mockStaff.setEmail("staff@library.com");

		when(memberRepository.findByAccount_Email("reader@library.com")).thenReturn(Optional.of(mockMember));
		when(borrowRecordRepository.findById(1L)).thenReturn(Optional.of(mockRecord));
		when(borrowRecordRepository.save(any(BorrowRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));
	}

	@Test
	@DisplayName("requestReturn success should change status to RETURN_PENDING, save notification and publish event")
	void testRequestReturn_Success() {
		when(accountRepository.findActiveAccountsByPermissionName("RETURN_CONFIRM"))
				.thenReturn(List.of(mockStaff));

		BorrowResponse response = borrowService.requestReturn("reader@library.com", 1L);

		assertEquals(BorrowStatus.RETURN_PENDING, response.getStatus());
		assertEquals("Lập trình Java cơ bản", response.getBookTitle());

		verify(notificationService).createReturnRequestNotifications(
				eq(List.of(mockStaff)),
				eq(1L),
				eq("Nguyen Van Reader"),
				eq("Lập trình Java cơ bản")
		);

		verify(eventPublisher).publishEvent(any(ReturnRequestedEvent.class));
	}

	@Test
	@DisplayName("requestReturn should throw BadRequestException when record is already RETURN_PENDING")
	void testRequestReturn_AlreadyReturnPending() {
		mockRecord.setStatus(BorrowStatus.RETURN_PENDING);

		BadRequestException ex = assertThrows(BadRequestException.class, () ->
				borrowService.requestReturn("reader@library.com", 1L));

		assertEquals("Bạn đã gửi yêu cầu trả cho cuốn sách này rồi!", ex.getMessage());
		verify(notificationService, never()).createReturnRequestNotifications(any(), any(), any(), any());
		verify(eventPublisher, never()).publishEvent(any());
	}

	@Test
	@DisplayName("requestReturn should throw BadRequestException when record is PENDING")
	void testRequestReturn_Pending() {
		mockRecord.setStatus(BorrowStatus.PENDING);

		BadRequestException ex = assertThrows(BadRequestException.class, () ->
				borrowService.requestReturn("reader@library.com", 1L));

		assertEquals("Yêu cầu mượn sách này chưa được duyệt!", ex.getMessage());
		verify(notificationService, never()).createReturnRequestNotifications(any(), any(), any(), any());
		verify(eventPublisher, never()).publishEvent(any());
	}

	@Test
	@DisplayName("requestReturn should throw BadRequestException when record is RETURNED")
	void testRequestReturn_AlreadyReturned() {
		mockRecord.setStatus(BorrowStatus.RETURNED);

		BadRequestException ex = assertThrows(BadRequestException.class, () ->
				borrowService.requestReturn("reader@library.com", 1L));

		assertEquals("Sách này đã được trả!", ex.getMessage());
		verify(notificationService, never()).createReturnRequestNotifications(any(), any(), any(), any());
		verify(eventPublisher, never()).publishEvent(any());
	}

	@Test
	@DisplayName("requestReturn should throw BadRequestException when member does not own the borrow record")
	void testRequestReturn_WrongMember() {
		Member otherMember = new Member();
		otherMember.setId(20L);
		Account otherAccount = new Account();
		otherAccount.setEmail("other@library.com");
		otherMember.setAccount(otherAccount);
		when(memberRepository.findByAccount_Email("other@library.com")).thenReturn(Optional.of(otherMember));

		BadRequestException ex = assertThrows(BadRequestException.class, () ->
				borrowService.requestReturn("other@library.com", 1L));

		assertEquals("Bạn không thể trả sách của member khác!", ex.getMessage());
		verify(notificationService, never()).createReturnRequestNotifications(any(), any(), any(), any());
		verify(eventPublisher, never()).publishEvent(any());
	}

	@Test
	@DisplayName("approveBorrow success should set status to BORROWED, decrement stock, create notification for borrower and publish BorrowApprovedEvent")
	void testApproveBorrow_Success() {
		mockRecord.setStatus(BorrowStatus.PENDING);
		mockBook.setQuantity(5);

		when(borrowRecordRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(mockRecord));
		when(bookRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(mockBook));
		when(bookRepository.save(any(Book.class))).thenAnswer(invocation -> invocation.getArgument(0));

		BorrowResponse response = borrowService.approveBorrow(1L);

		assertEquals(BorrowStatus.BORROWED, response.getStatus());
		assertEquals(4, mockBook.getQuantity());

		verify(notificationService).createBorrowApprovedNotification(
				eq(mockMember.getAccount()),
				eq(1L),
				eq(100L),
				eq("Lập trình Java cơ bản"),
				any()
		);
		verify(eventPublisher).publishEvent(any(com.librarymanagement.event.BorrowApprovedEvent.class));
	}

	@Test
	@DisplayName("approveBorrow should throw BadRequestException when record is not PENDING")
	void testApproveBorrow_NotPending() {
		mockRecord.setStatus(BorrowStatus.BORROWED);
		when(borrowRecordRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(mockRecord));

		BadRequestException ex = assertThrows(BadRequestException.class, () ->
				borrowService.approveBorrow(1L));

		assertEquals("Chỉ có thể duyệt yêu cầu mượn đang ở trạng thái chờ duyệt (PENDING)!", ex.getMessage());
		verify(notificationService, never()).createBorrowApprovedNotification(any(), any(), any(), any(), any());
		verify(eventPublisher, never()).publishEvent(any());
	}

	@Test
	@DisplayName("approveBorrow should throw BadRequestException when book is out of stock")
	void testApproveBorrow_OutOfStock() {
		mockRecord.setStatus(BorrowStatus.PENDING);
		mockBook.setQuantity(0);

		when(borrowRecordRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(mockRecord));
		when(bookRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(mockBook));

		BadRequestException ex = assertThrows(BadRequestException.class, () ->
				borrowService.approveBorrow(1L));

		assertEquals("Sách \"Lập trình Java cơ bản\" đã hết hàng trong kho, không thể duyệt!", ex.getMessage());
		verify(notificationService, never()).createBorrowApprovedNotification(any(), any(), any(), any(), any());
		verify(eventPublisher, never()).publishEvent(any());
	}
}
