package com.librarymanagement.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.dto.request.BorrowBookRequest;
import com.librarymanagement.dto.response.BorrowResponse;
import com.librarymanagement.entity.Book;
import com.librarymanagement.entity.BorrowRecord;
import com.librarymanagement.entity.BorrowStatus;
import com.librarymanagement.entity.Member;
import com.librarymanagement.exception.BadRequestException;
import com.librarymanagement.exception.ResourceNotFoundException;
import com.librarymanagement.repository.BookRepository;
import com.librarymanagement.repository.BorrowRecordRepository;
import com.librarymanagement.repository.MemberRepository;

@Service
public class BorrowService {

	private final BorrowRecordRepository borrowRecordRepository;
	private final MemberRepository memberRepository;
	private final BookRepository bookRepository;

	public BorrowService(//
			BorrowRecordRepository borrowRecordRepository, //
			MemberRepository memberRepository, //
			BookRepository bookRepository//
	) {

		this.borrowRecordRepository = borrowRecordRepository;
		this.memberRepository = memberRepository;
		this.bookRepository = bookRepository;
	}

	// =========================
	// MUON NHIEU SACH (YEU CAU MUON - PENDING)
	// =========================

	@Transactional
	public List<BorrowResponse> borrowBooks(String email, BorrowBookRequest request) {

		// Lay dung member dang login
		Member member = getMemberByEmail(email);

		if (request.getBookIds() == null || request.getBookIds().isEmpty()) {
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

		// Tao record muon o trang thai PENDING
		// TUYET DOI KHONG TRU KHO O BUOC NAY
		for (Book book : books) {
			BorrowRecord record = new BorrowRecord();
			record.setMember(member);
			record.setBook(book);
			record.setBorrowDate(null);
			record.setReturnDate(null);
			record.setStatus(BorrowStatus.PENDING);

			BorrowRecord savedRecord = borrowRecordRepository.save(record);
			responses.add(toResponse(savedRecord));
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

		return toResponse(savedRecord);
	}

	// =========================
	// STAFF / ADMIN: DANH SACH QUAN LY MUON TRA
	// =========================

	@Transactional
	public List<BorrowResponse> getAllBorrowRecords() {

		return borrowRecordRepository.findAllByOrderByIdDesc().stream().map(this::toResponse).toList();
	}

	// =========================
	// STAFF / ADMIN: DUYET MUON
	// =========================

	@Transactional
	public BorrowResponse approveBorrow(Long borrowRecordId) {

		BorrowRecord record = borrowRecordRepository.findById(borrowRecordId)
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu mượn có id: " + borrowRecordId));

		if (record.getStatus() != BorrowStatus.PENDING) {
			throw new BadRequestException("Chỉ có thể duyệt yêu cầu mượn đang ở trạng thái chờ duyệt (PENDING)!");
		}

		Book book = record.getBook();

		if (book.getQuantity() <= 0) {
			throw new BadRequestException("Sách \"" + book.getTitle() + "\" đã hết hàng trong kho, không thể duyệt!");
		}

		// Tru ton kho
		book.setQuantity(book.getQuantity() - 1);
		bookRepository.save(book);

		// Cap nhat record
		record.setStatus(BorrowStatus.BORROWED);
		record.setBorrowDate(LocalDate.now());
		record.setReturnDate(null);

		BorrowRecord savedRecord = borrowRecordRepository.save(record);

		return toResponse(savedRecord);
	}

	// =========================
	// STAFF / ADMIN: TU CHOI MUON
	// =========================

	@Transactional
	public BorrowResponse rejectBorrow(Long borrowRecordId) {

		BorrowRecord record = borrowRecordRepository.findById(borrowRecordId)
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
	// STAFF / ADMIN: XAC NHAN TRA
	// =========================

	@Transactional
	public BorrowResponse confirmReturn(Long borrowRecordId) {

		BorrowRecord record = borrowRecordRepository.findById(borrowRecordId)
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu mượn có id: " + borrowRecordId));

		if (record.getStatus() != BorrowStatus.RETURN_PENDING) {
			throw new BadRequestException(
					"Chỉ có thể xác nhận trả sách cho yêu cầu đang chờ xác nhận (RETURN_PENDING)!");
		}

		// Cong lai kho
		Book book = record.getBook();
		book.setQuantity(book.getQuantity() + 1);
		bookRepository.save(book);

		// Cap nhat record
		record.setStatus(BorrowStatus.RETURNED);
		record.setReturnDate(LocalDate.now());

		BorrowRecord savedRecord = borrowRecordRepository.save(record);

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

		return new BorrowResponse(record.getId(), record.getMember().getId(), record.getMember().getFullName(),
				record.getBook().getId(), record.getBook().getTitle(), record.getBorrowDate(), record.getReturnDate(),
				record.getStatus());
	}
}