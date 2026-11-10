package com.librarymanagement.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.dto.request.BorrowBookRequest;
import com.librarymanagement.dto.response.BorrowResponse;
import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.Book;
import com.librarymanagement.entity.BorrowRecord;
import com.librarymanagement.entity.BorrowStatus;
import com.librarymanagement.entity.Member;
import com.librarymanagement.entity.Notification;
import com.librarymanagement.event.BorrowRequestedEvent;
import com.librarymanagement.event.BorrowApprovedEvent;
import com.librarymanagement.event.ReturnRequestedEvent;
import com.librarymanagement.event.BookInventoryChangedEvent;
import com.librarymanagement.exception.BadRequestException;
import com.librarymanagement.exception.ResourceNotFoundException;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.repository.BookRepository;
import com.librarymanagement.repository.BorrowCriteriaRepository;
import com.librarymanagement.repository.BorrowRecordRepository;
import com.librarymanagement.repository.MemberRepository;

@Service
public class BorrowService {

	private final BorrowRecordRepository borrowRecordRepository;
	private final MemberRepository memberRepository;
	private final BookRepository bookRepository;
	private final BorrowCriteriaRepository borrowCriteriaRepository;
	private final AccountRepository accountRepository;
	private final NotificationService notificationService;
	private final ApplicationEventPublisher eventPublisher;
	private final SystemConfigService systemConfigService;
	private final SseNotificationService sseNotificationService;

	@Autowired
	public BorrowService(
			BorrowRecordRepository borrowRecordRepository,
			MemberRepository memberRepository,
			BookRepository bookRepository,
			BorrowCriteriaRepository borrowCriteriaRepository,
			AccountRepository accountRepository,
			NotificationService notificationService,
			ApplicationEventPublisher eventPublisher,
			SystemConfigService systemConfigService,
			SseNotificationService sseNotificationService) {

		this.borrowRecordRepository = borrowRecordRepository;
		this.memberRepository = memberRepository;
		this.bookRepository = bookRepository;
		this.borrowCriteriaRepository = borrowCriteriaRepository;
		this.accountRepository = accountRepository;
		this.notificationService = notificationService;
		this.eventPublisher = eventPublisher;
		this.systemConfigService = systemConfigService;
		this.sseNotificationService = sseNotificationService;
	}

	// Constructor tương thích ngược cho unit test (7 tham số)
	public BorrowService(
			BorrowRecordRepository borrowRecordRepository,
			MemberRepository memberRepository,
			BookRepository bookRepository,
			BorrowCriteriaRepository borrowCriteriaRepository,
			AccountRepository accountRepository,
			NotificationService notificationService,
			ApplicationEventPublisher eventPublisher) {

		this(borrowRecordRepository, memberRepository, bookRepository, borrowCriteriaRepository, accountRepository, notificationService, eventPublisher, null, null);
	}

	// Constructor tương thích ngược cho unit test (4 tham số)
	public BorrowService(
			BorrowRecordRepository borrowRecordRepository,
			MemberRepository memberRepository,
			BookRepository bookRepository,
			BorrowCriteriaRepository borrowCriteriaRepository) {

		this(borrowRecordRepository, memberRepository, bookRepository, borrowCriteriaRepository, null, null, null, null, null);
	}

	// Constructor tương thích ngược cho unit test (3 tham số)
	public BorrowService(
			BorrowRecordRepository borrowRecordRepository,
			MemberRepository memberRepository,
			BookRepository bookRepository) {

		this(borrowRecordRepository, memberRepository, bookRepository, null, null, null, null, null, null);
	}

	// =========================
	// MUON NHIEU SACH (YEU CAU MUON - PENDING)
	// =========================

	@Transactional
	public List<BorrowResponse> borrowBooks(String email, BorrowBookRequest request) {

		// Lay dung member dang login
		Member member = getMemberByEmail(email);

		// Chặn mượn sách nếu tài khoản độc giả đang bị khóa hoặc đã bị xóa
		if (member.getAccount() != null && (Boolean.FALSE.equals(member.getAccount().getEnabled())
				|| Boolean.TRUE.equals(member.getAccount().getIsDelete()))) {
			throw new BadRequestException("Tài khoản của bạn đã bị khóa hoặc bị xóa. Bạn không thể mượn sách mới!");
		}

		if (request == null || request.getBookIds() == null || request.getBookIds().isEmpty()) {
			throw new BadRequestException("Danh sách sách không được để trống!");
		}

		// Khong cho Book ID trung nhau
		Set<Long> uniqueBookIds = new LinkedHashSet<>(request.getBookIds());

		if (uniqueBookIds.size() != request.getBookIds().size()) {
			throw new BadRequestException("Danh sách sách có Book ID bị trùng!");
		}

		/*
		 * Kiem tra tat ca sach truoc.
		 *
		 * Neu 1 sach loi thi Transaction rollback, khong muon nua chung.
		 */
		List<Book> books = new ArrayList<>();

		for (Long bookId : uniqueBookIds) {
			if (bookId == null || bookId <= 0) {
				throw new BadRequestException("Book ID không hợp lệ: " + bookId);
			}

			Book book = bookRepository.findById(bookId)
					.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sách có id: " + bookId));

			if (book.getQuantity() <= 0) {
				throw new BadRequestException("Sách \"" + book.getTitle() + "\" đã hết!");
			}

			books.add(book);
		}

		List<BorrowResponse> responses = new ArrayList<>();
		List<Long> savedRecordIds = new ArrayList<>();

		// Tao record muon o trang thai PENDING
		// TUYET DOI KHONG TRU KHO O BUOC NAY (cho phep nhieu PENDING, kiem soat chat che tai thoi diem duyet)
		for (Book book : books) {
			BorrowRecord record = new BorrowRecord();
			record.setMember(member);
			record.setBook(book);
			record.setBorrowDate(null);
			record.setReturnDate(null);
			record.setStatus(BorrowStatus.PENDING);

			BorrowRecord savedRecord = borrowRecordRepository.save(record);
			savedRecordIds.add(savedRecord.getId());
			responses.add(toResponse(savedRecord));
		}

		// Xử lý tạo thông báo và phát sinh sự kiện cho Thủ thư / Admin (BORROW_APPROVE)
		String batchCode = (request.getRequestId() != null && !request.getRequestId().trim().isEmpty())
				? "REQ-" + request.getRequestId().trim()
				: "REQ-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8);

		List<String> bookTitles = books.stream().map(Book::getTitle).toList();

		if (accountRepository != null && notificationService != null && !savedRecordIds.isEmpty()) {
			List<Account> activeStaffAndAdmins = accountRepository.findActiveAccountsByPermissionName("BORROW_APPROVE");
			if (!activeStaffAndAdmins.isEmpty()) {
				// Lưu thông báo bền vững vào Database ngay trong transaction hiện tại
				notificationService.createBorrowRequestNotifications(
						activeStaffAndAdmins,
						batchCode,
						member.getFullName(),
						bookTitles,
						savedRecordIds.get(0));

				// Bắn sự kiện nghiệp vụ sau commit để xử lý SSE và FCM bất đồng bộ
				if (eventPublisher != null) {
					List<Long> recipientIds = activeStaffAndAdmins.stream().map(Account::getId).toList();
					eventPublisher.publishEvent(new BorrowRequestedEvent(
							batchCode,
							member.getId(),
							member.getFullName(),
							bookTitles,
							books.size(),
							savedRecordIds,
							recipientIds,
							LocalDateTime.now()));
				}
			}
		}

		return responses;
	}

	// =========================
	// SACH CUA TOI (TAT CA TRANG THAI)
	// =========================

	@Transactional
	public List<BorrowResponse> getBorrowedBooksByEmail(String email) {

		Member member = getMemberByEmail(email);

		return borrowRecordRepository.findByMember_IdOrderByIdDesc(member.getId()).stream().map(this::toResponse)
				.toList();
	}

	// =========================
	// USER YEU CAU TRA SACH
	// =========================

	@Transactional
	public BorrowResponse requestReturn(String email, Long borrowRecordId) {

		Member member = getMemberByEmail(email);

		BorrowRecord record = borrowRecordRepository.findById(borrowRecordId)
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu mượn có id: " + borrowRecordId));

		// Khong cho user tra sach cua member khac
		if (!record.getMember().getId().equals(member.getId())) {
			throw new BadRequestException("Bạn không thể trả sách của member khác!");
		}

		if (record.getStatus() == BorrowStatus.PENDING) {
			throw new BadRequestException("Yêu cầu mượn sách này chưa được duyệt!");
		}

		if (record.getStatus() == BorrowStatus.RETURN_PENDING) {
			throw new BadRequestException("Bạn đã gửi yêu cầu trả cho cuốn sách này rồi!");
		}

		if (record.getStatus() == BorrowStatus.RETURNED) {
			throw new BadRequestException("Sách này đã được trả!");
		}

		if (record.getStatus() == BorrowStatus.REJECTED) {
			throw new BadRequestException("Yêu cầu mượn sách này đã bị từ chối!");
		}

		if (record.getStatus() != BorrowStatus.BORROWED) {
			throw new BadRequestException("Chỉ có thể yêu cầu trả cho sách đang ở trạng thái đang mượn (BORROWED)!");
		}

		// Chuyen trang thai sang RETURN_PENDING
		// KHONG cong quantity, KHONG set returnDate
		record.setStatus(BorrowStatus.RETURN_PENDING);

		BorrowRecord savedRecord = borrowRecordRepository.save(record);

		// Xử lý tạo thông báo và phát sinh sự kiện cho Thủ thư / Admin có quyền (RETURN_CONFIRM)
		if (accountRepository != null && notificationService != null) {
			List<Account> activeStaffAndAdmins = accountRepository.findActiveAccountsByPermissionName("RETURN_CONFIRM");
			if (!activeStaffAndAdmins.isEmpty()) {
				String bookTitle = (savedRecord.getBook() != null && savedRecord.getBook().getTitle() != null)
						? savedRecord.getBook().getTitle()
						: "Sách";
				Long bookId = savedRecord.getBook() != null ? savedRecord.getBook().getId() : null;

				// Lưu thông báo bền vững vào Database ngay trong transaction hiện tại
				notificationService.createReturnRequestNotifications(
						activeStaffAndAdmins,
						savedRecord.getId(),
						member.getFullName(),
						bookTitle);

				// Bắn sự kiện nghiệp vụ sau commit để xử lý SSE và FCM bất đồng bộ
				if (eventPublisher != null) {
					List<Long> recipientIds = activeStaffAndAdmins.stream().map(Account::getId).toList();
					eventPublisher.publishEvent(new ReturnRequestedEvent(
							savedRecord.getId(),
							member.getId(),
							member.getFullName(),
							bookId,
							bookTitle,
							recipientIds,
							LocalDateTime.now()));
				}
			}
		}

		return toResponse(savedRecord);
	}

	// =========================
	// STAFF / ADMIN: DANH SACH QUAN LY MUON TRA (CO HO TRO TIM KIEM & BO LOC)
	// =========================

	@Transactional(readOnly = true)
	public List<BorrowResponse> searchBorrowRecords(
			String memberName,
			String bookTitle,
			LocalDate fromDate,
			LocalDate toDate,
			LocalDate date,
			BorrowStatus status) {

		if (borrowCriteriaRepository != null) {
			return borrowCriteriaRepository.search(memberName, bookTitle, fromDate, toDate, date, status)
					.stream()
					.map(this::toResponse)
					.toList();
		}

		return borrowRecordRepository.findAllByOrderByIdDesc().stream().map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public List<BorrowResponse> getAllBorrowRecords() {
		return searchBorrowRecords(null, null, null, null, null, null);
	}

	// =========================
	// STAFF / ADMIN: DUYET MUON (CONCURRENCY-SAFE VỚI PESSIMISTIC LOCK)
	// =========================

	@Transactional
	public BorrowResponse approveBorrow(Long borrowRecordId) {

		// Khóa dòng pessimistic write trên phiếu mượn để tránh duyệt trùng
		BorrowRecord record = borrowRecordRepository.findByIdForUpdate(borrowRecordId)
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu mượn có id: " + borrowRecordId));

		if (record.getStatus() != BorrowStatus.PENDING) {
			throw new BadRequestException("Chỉ có thể duyệt yêu cầu mượn đang ở trạng thái chờ duyệt (PENDING)!");
		}

		// Không cho duyệt đơn nếu tài khoản độc giả đang bị khóa
		if (record.getMember() != null && record.getMember().getAccount() != null
				&& Boolean.FALSE.equals(record.getMember().getAccount().getEnabled())) {
			throw new BadRequestException("Không thể duyệt phiếu mượn vì tài khoản độc giả này hiện đang bị khóa!");
		}

		// Khóa dòng pessimistic write trên cuốn sách trong kho (SELECT ... FOR UPDATE)
		Book book = bookRepository.findByIdForUpdate(record.getBook().getId())
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sách!"));

		// Kiểm tra nghiêm ngặt tồn kho tại thời điểm giữ khóa
		if (book.getQuantity() <= 0) {
			throw new BadRequestException("Sách \"" + book.getTitle() + "\" đã hết hàng trong kho, không thể duyệt!");
		}

		// Trừ tồn kho nguyên tử
		book.setQuantity(book.getQuantity() - 1);
		bookRepository.save(book);

		// Cập nhật trạng thái phiếu mượn
		record.setStatus(BorrowStatus.BORROWED);
		record.setBorrowDate(LocalDate.now());

		// Lấy thời hạn mượn sách động từ cấu hình hệ thống trong Database (mặc định 7 ngày)
		int durationDays = (systemConfigService != null) ? systemConfigService.getBorrowDurationDays() : 7;
		record.setDueDate(LocalDate.now().plusDays(durationDays));
		record.setReturnDate(null);

		BorrowRecord savedRecord = borrowRecordRepository.save(record);

		// Tạo thông báo mượn sách được phê duyệt (BORROW_APPROVED) gửi đến CHÍNH ĐỘC GIẢ sở hữu phiếu mượn
		if (notificationService != null && savedRecord.getMember() != null && savedRecord.getMember().getAccount() != null) {
			Account borrowerAccount = savedRecord.getMember().getAccount();
			Notification approvedNotification = notificationService.createBorrowApprovedNotification(
					borrowerAccount,
					savedRecord.getId(),
					book.getId(),
					book.getTitle(),
					savedRecord.getDueDate()
			);

			// Phát sự kiện nghiệp vụ sau khi Transaction commit thành công để gửi SSE và FCM Push
			if (eventPublisher != null) {
				DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
				String formattedDueDate = savedRecord.getDueDate() != null
						? savedRecord.getDueDate().format(formatter)
						: "Theo quy định";

				eventPublisher.publishEvent(new BorrowApprovedEvent(
						approvedNotification != null ? approvedNotification.getId() : null,
						savedRecord.getId(),
						book.getId(),
						book.getTitle(),
						borrowerAccount.getId(),
						savedRecord.getDueDate(),
						formattedDueDate,
						approvedNotification != null ? approvedNotification.getTitle() : "Yêu cầu mượn sách đã được duyệt!",
						approvedNotification != null ? approvedNotification.getContent() : String.format(
								"Yêu cầu mượn sách \"%s\" của bạn đã được phê duyệt thành công. Hạn trả: %s. Vui lòng đến thư viện nhận sách theo quy định.",
								book.getTitle(), formattedDueDate),
						LocalDateTime.now()
				));
			}
		}

		// Phát sự kiện cập nhật tồn kho an toàn: Chỉ gửi SSE sau khi Transaction commit thành công và chỉ gửi tới các tài khoản có quyền BOOK_VIEW
		if (eventPublisher != null && accountRepository != null) {
			List<Account> viewAccounts = accountRepository.findActiveAccountsByPermissionName("BOOK_VIEW");
			List<Long> viewAccountIds = viewAccounts.stream().map(Account::getId).toList();
			eventPublisher.publishEvent(new BookInventoryChangedEvent(
					book.getId(),
					book.getTitle(),
					book.getQuantity(),
					viewAccountIds
			));
		}

		return toResponse(savedRecord);
	}

	// =========================
	// STAFF / ADMIN: TU CHOI MUON
	// =========================

	@Transactional
	public BorrowResponse rejectBorrow(Long borrowRecordId) {

		BorrowRecord record = borrowRecordRepository.findByIdForUpdate(borrowRecordId)
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu mượn có id: " + borrowRecordId));

		if (record.getStatus() != BorrowStatus.PENDING) {
			throw new BadRequestException("Chỉ có thể từ chối yêu cầu mượn đang ở trạng thái chờ duyệt (PENDING)!");
		}

		// Cap nhat record
		record.setStatus(BorrowStatus.REJECTED);
		record.setBorrowDate(null);
		record.setReturnDate(null);

		BorrowRecord savedRecord = borrowRecordRepository.save(record);

		return toResponse(savedRecord);
	}

	// =========================
	// STAFF / ADMIN: XAC NHAN TRA (CONCURRENCY-SAFE VỚI PESSIMISTIC LOCK)
	// =========================

	@Transactional
	public BorrowResponse confirmReturn(Long borrowRecordId) {

		// Khóa dòng pessimistic write trên phiếu mượn để tránh 2 thủ thư cùng bấm xác nhận trả
		BorrowRecord record = borrowRecordRepository.findByIdForUpdate(borrowRecordId)
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu mượn có id: " + borrowRecordId));

		if (record.getStatus() != BorrowStatus.RETURN_PENDING) {
			throw new BadRequestException(
					"Chỉ có thể xác nhận trả sách cho yêu cầu đang chờ xác nhận (RETURN_PENDING)!");
		}

		// Khóa dòng trên sách và cộng lại tồn kho
		Book book = bookRepository.findByIdForUpdate(record.getBook().getId())
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sách!"));
		book.setQuantity(book.getQuantity() + 1);
		bookRepository.save(book);

		// Cập nhật record
		record.setStatus(BorrowStatus.RETURNED);
		record.setReturnDate(LocalDate.now());

		BorrowRecord savedRecord = borrowRecordRepository.save(record);

		// Phát sự kiện cập nhật tồn kho an toàn: Chỉ gửi SSE sau khi Transaction commit thành công và chỉ gửi tới các tài khoản có quyền BOOK_VIEW
		if (eventPublisher != null && accountRepository != null) {
			List<Account> viewAccounts = accountRepository.findActiveAccountsByPermissionName("BOOK_VIEW");
			List<Long> viewAccountIds = viewAccounts.stream().map(Account::getId).toList();
			eventPublisher.publishEvent(new BookInventoryChangedEvent(
					book.getId(),
					book.getTitle(),
					book.getQuantity(),
					viewAccountIds
			));
		}

		return toResponse(savedRecord);
	}

	// =========================
	// TIM MEMBER DANG LOGIN
	// =========================

	private Member getMemberByEmail(String email) {

		return memberRepository.findByAccount_Email(email).orElseThrow(() -> //
		new ResourceNotFoundException("Không tìm thấy member của tài khoản đang đăng nhập!"));
	}

	// =========================
	// ENTITY -> RESPONSE
	// =========================

	private BorrowResponse toResponse(BorrowRecord record) {
		LocalDate borrowDate = record.getBorrowDate();
		LocalDate dueDate = record.getDueDate();
		LocalDate returnDate = record.getReturnDate();
		BorrowStatus status = record.getStatus();

		boolean isOverdue = false;
		long overdueDays = 0;

		// Tự động kiểm tra quá hạn sách:
		if (dueDate != null) {
			if (status == BorrowStatus.BORROWED || status == BorrowStatus.RETURN_PENDING) {
				// Đang cầm sách: nếu ngày hiện tại đã vượt quá hạn trả
				if (LocalDate.now().isAfter(dueDate)) {
					isOverdue = true;
					overdueDays = ChronoUnit.DAYS.between(dueDate, LocalDate.now());
				}
			} else if (status == BorrowStatus.RETURNED && returnDate != null) {
				// Đã trả sách: kiểm tra ngày trả thực tế có bị trễ hạn hay không
				if (returnDate.isAfter(dueDate)) {
					isOverdue = true;
					overdueDays = ChronoUnit.DAYS.between(dueDate, returnDate);
				}
			}
		}

		return new BorrowResponse(
				record.getId(),
				record.getMember().getId(),
				record.getMember().getFullName(),
				record.getBook().getId(),
				record.getBook().getTitle(),
				borrowDate,
				dueDate,
				returnDate,
				status,
				isOverdue,
				overdueDays
		);
	}
}
