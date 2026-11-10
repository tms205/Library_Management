package com.librarymanagement.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.Book;
import com.librarymanagement.entity.BorrowRecord;
import com.librarymanagement.entity.BorrowStatus;
import com.librarymanagement.entity.Member;
import com.librarymanagement.entity.Role;
import com.librarymanagement.exception.BadRequestException;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.repository.BookRepository;
import com.librarymanagement.repository.BorrowRecordRepository;
import com.librarymanagement.repository.MemberRepository;

@SpringBootTest
class BorrowConcurrencyIntegrationTest {

	@Autowired
	private BorrowService borrowService;

	@Autowired
	private BookRepository bookRepository;

	@Autowired
	private BorrowRecordRepository borrowRecordRepository;

	@Autowired
	private MemberRepository memberRepository;

	@Autowired
	private AccountRepository accountRepository;

	@Test
	@DisplayName("Kiểm thử đồng thời thực tế trên Database: Tồn kho = 1, hai thủ thư duyệt mượn song song -> Đúng 1 thành công, 1 thất bại, tồn kho = 0")
	void testConcurrentApproveBorrow_OverbookingPrevented() throws Exception {
		// 1. Chuẩn bị dữ liệu mẫu cô lập cho bài test
		String uniqueSuffix = UUID.randomUUID().toString().substring(0, 8);
		
		Account account = new Account();
		account.setEmail("test-concurrent-" + uniqueSuffix + "@library.com");
		account.setPassword("encodedPassword123");
		account.setRole(Role.USER);
		account.setEnabled(true);
		account.setIsDelete(false);
		account = accountRepository.save(account);

		Member member = new Member();
		member.setAccount(account);
		member.setFullName("Concurrent Test User " + uniqueSuffix);
		member.setPhone("098" + System.currentTimeMillis() % 10000000);
		member.setAddress("Hanoi, Vietnam");
		member.setDateOfBirth(LocalDate.of(2000, 1, 1));
		member = memberRepository.save(member);

		// Tạo cuốn sách với TỒN KHO = 1 DUY NHẤT
		Book book = new Book();
		book.setTitle("Sách Kiểm Thử Đồng Thời " + uniqueSuffix);
		book.setIsbn("ISBN-" + uniqueSuffix);
		book.setQuantity(1);
		book = bookRepository.save(book);

		// Tạo 2 phiếu mượn riêng biệt ở trạng thái PENDING cho cùng 1 cuốn sách trên
		BorrowRecord record1 = new BorrowRecord();
		record1.setBook(book);
		record1.setMember(member);
		record1.setStatus(BorrowStatus.PENDING);
		record1 = borrowRecordRepository.save(record1);

		BorrowRecord record2 = new BorrowRecord();
		record2.setBook(book);
		record2.setMember(member);
		record2.setStatus(BorrowStatus.PENDING);
		record2 = borrowRecordRepository.save(record2);

		Long record1Id = record1.getId();
		Long record2Id = record2.getId();
		Long bookId = book.getId();

		// 2. Kích hoạt 2 luồng đồng thời duyệt mượn cùng lúc
		int numberOfThreads = 2;
		ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
		CountDownLatch readyLatch = new CountDownLatch(numberOfThreads);
		CountDownLatch startLatch = new CountDownLatch(1);
		CountDownLatch doneLatch = new CountDownLatch(numberOfThreads);

		AtomicInteger successCount = new AtomicInteger(0);
		AtomicInteger failureCount = new AtomicInteger(0);
		List<String> failureMessages = Collections.synchronizedList(new ArrayList<>());

		// Thread 1: Duyệt record 1
		executor.submit(() -> {
			readyLatch.countDown();
			try {
				startLatch.await();
				borrowService.approveBorrow(record1Id);
				successCount.incrementAndGet();
			} catch (BadRequestException e) {
				failureCount.incrementAndGet();
				failureMessages.add(e.getMessage());
			} catch (Exception e) {
				failureCount.incrementAndGet();
				failureMessages.add(e.getClass().getSimpleName() + ": " + e.getMessage());
			} finally {
				doneLatch.countDown();
			}
		});

		// Thread 2: Duyệt record 2
		executor.submit(() -> {
			readyLatch.countDown();
			try {
				startLatch.await();
				borrowService.approveBorrow(record2Id);
				successCount.incrementAndGet();
			} catch (BadRequestException e) {
				failureCount.incrementAndGet();
				failureMessages.add(e.getMessage());
			} catch (Exception e) {
				failureCount.incrementAndGet();
				failureMessages.add(e.getClass().getSimpleName() + ": " + e.getMessage());
			} finally {
				doneLatch.countDown();
			}
		});

		// Đợi cả 2 thread sẵn sàng rồi phát lệnh chạy cùng một tích tắc
		readyLatch.await(5, TimeUnit.SECONDS);
		startLatch.countDown();
		doneLatch.await(10, TimeUnit.SECONDS);
		executor.shutdown();

		// 3. Nghiệm thu kết quả bắt buộc:
		// - Chính xác 1 giao dịch thành công
		assertEquals(1, successCount.get(), "Chính xác 1 giao dịch duyệt mượn phải thành công!");
		// - Chính xác 1 giao dịch thất bại
		assertEquals(1, failureCount.get(), "Chính xác 1 giao dịch duyệt mượn phải thất bại do hết tồn kho!");
		// - Thông báo lỗi chứa lý do hết hàng trong kho
		assertTrue(failureMessages.get(0).contains("hết hàng trong kho"), 
				"Thông báo lỗi phải chỉ rõ sách đã hết: " + failureMessages.get(0));

		// - Tồn kho sau cùng trong Database phải là 0 (TUYỆT ĐỐI KHÔNG ÂM)
		Book reloadedBook = bookRepository.findById(bookId).orElseThrow();
		assertEquals(0, reloadedBook.getQuantity(), "Tồn kho trong cơ sở dữ liệu sau khi duyệt phải bằng đúng 0!");

		// - Trong cơ sở dữ liệu: chính xác 1 record là BORROWED, 1 record vẫn giữ PENDING
		BorrowRecord r1 = borrowRecordRepository.findById(record1Id).orElseThrow();
		BorrowRecord r2 = borrowRecordRepository.findById(record2Id).orElseThrow();

		long borrowedCount = (r1.getStatus() == BorrowStatus.BORROWED ? 1 : 0) + (r2.getStatus() == BorrowStatus.BORROWED ? 1 : 0);
		long pendingCount = (r1.getStatus() == BorrowStatus.PENDING ? 1 : 0) + (r2.getStatus() == BorrowStatus.PENDING ? 1 : 0);

		assertEquals(1, borrowedCount, "Chỉ duy nhất 1 phiếu được chuyển sang BORROWED!");
		assertEquals(1, pendingCount, "Phiếu còn lại phải được giữ nguyên trạng thái PENDING!");
	}

	@Test
	@DisplayName("Kiểm thử đồng thời thực tế trên Database: Hai thủ thư cùng bấm xác nhận trả một phiếu mượn -> Đúng 1 thành công, 1 thất bại, tồn kho chỉ tăng 1")
	void testConcurrentConfirmReturn_DoubleIncrementPrevented() throws Exception {
		String uniqueSuffix = UUID.randomUUID().toString().substring(0, 8);

		Account account = new Account();
		account.setEmail("test-return-" + uniqueSuffix + "@library.com");
		account.setPassword("encodedPassword123");
		account.setRole(Role.USER);
		account.setEnabled(true);
		account.setIsDelete(false);
		account = accountRepository.save(account);

		Member member = new Member();
		member.setAccount(account);
		member.setFullName("Return Test User " + uniqueSuffix);
		member.setPhone("097" + System.currentTimeMillis() % 10000000);
		member.setAddress("Da Nang, Vietnam");
		member.setDateOfBirth(LocalDate.of(2001, 2, 2));
		member = memberRepository.save(member);

		// Cuốn sách ban đầu có tồn kho = 0 (vì sách đang được mượn)
		Book book = new Book();
		book.setTitle("Sách Trả Đồng Thời " + uniqueSuffix);
		book.setIsbn("ISBN-RET-" + uniqueSuffix);
		book.setQuantity(0);
		book = bookRepository.save(book);

		// Phiếu mượn đang ở trạng thái RETURN_PENDING
		BorrowRecord returnRecord = new BorrowRecord();
		returnRecord.setBook(book);
		returnRecord.setMember(member);
		returnRecord.setStatus(BorrowStatus.RETURN_PENDING);
		returnRecord.setBorrowDate(LocalDate.now().minusDays(3));
		returnRecord.setDueDate(LocalDate.now().plusDays(7));
		returnRecord = borrowRecordRepository.save(returnRecord);

		Long returnRecordId = returnRecord.getId();
		Long bookId = book.getId();

		// Hai luồng cùng gọi confirmReturn cho CÙNG 1 phiếu mượn này
		int numberOfThreads = 2;
		ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
		CountDownLatch readyLatch = new CountDownLatch(numberOfThreads);
		CountDownLatch startLatch = new CountDownLatch(1);
		CountDownLatch doneLatch = new CountDownLatch(numberOfThreads);

		AtomicInteger successCount = new AtomicInteger(0);
		AtomicInteger failureCount = new AtomicInteger(0);

		for (int i = 0; i < numberOfThreads; i++) {
			executor.submit(() -> {
				readyLatch.countDown();
				try {
					startLatch.await();
					borrowService.confirmReturn(returnRecordId);
					successCount.incrementAndGet();
				} catch (BadRequestException e) {
					failureCount.incrementAndGet();
				} catch (Exception e) {
					failureCount.incrementAndGet();
				} finally {
					doneLatch.countDown();
				}
			});
		}

		readyLatch.await(5, TimeUnit.SECONDS);
		startLatch.countDown();
		doneLatch.await(10, TimeUnit.SECONDS);
		executor.shutdown();

		// Nghiệm thu:
		assertEquals(1, successCount.get(), "Chỉ 1 yêu cầu xác nhận trả sách được chấp thuận!");
		assertEquals(1, failureCount.get(), "Yêu cầu xác nhận trả thứ hai phải bị từ chối!");

		// Tồn kho chỉ được cộng đúng 1 lần: 0 + 1 = 1 (TUYỆT ĐỐI KHÔNG THỂ = 2)
		Book reloadedBook = bookRepository.findById(bookId).orElseThrow();
		assertEquals(1, reloadedBook.getQuantity(), "Tồn kho trong cơ sở dữ liệu chỉ được cộng tăng 1!");

		// Trạng thái phiếu là RETURNED
		BorrowRecord reloadedRecord = borrowRecordRepository.findById(returnRecordId).orElseThrow();
		assertEquals(BorrowStatus.RETURNED, reloadedRecord.getStatus());
	}
}
