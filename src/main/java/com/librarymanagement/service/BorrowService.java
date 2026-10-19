package com.librarymanagement.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;

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

import jakarta.transaction.Transactional;

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
	// MUON NHIEU SACH
	// =========================

	@Transactional
	public List<BorrowResponse> borrowBooks(String email, BorrowBookRequest request) {

		// Lay dung member dang login
		Member member = //
				getMemberByEmail(email);

		// Khong cho Book ID trung nhau
		Set<Long> uniqueBookIds = //
				new LinkedHashSet<>(request.getBookIds());

		if (uniqueBookIds.size() != request.getBookIds().size()) {

			throw new BadRequestException("Danh sách sách có Book ID bị trùng!");
		}

		/*
		 * Kiem tra tat ca sach truoc.
		 *
		 * Neu 1 sach loi thi Transaction rollback, khong muon nua chung.
		 */
		List<Book> books = //
				new ArrayList<>();

		for (Long bookId : uniqueBookIds) {

			Book book = //
					bookRepository.findById(bookId).orElseThrow(() -> //
					new ResourceNotFoundException("Không tìm thấy sách có id: " + bookId));

			if (book.getQuantity() <= 0) {

				throw new BadRequestException("Sách \"" + book.getTitle() + "\" đã hết!");
			}

			books.add(book);
		}

		List<BorrowResponse> responses = //
				new ArrayList<>();

		// Muon tung sach
		for (Book book : books) {

			// Tru ton kho
			book.setQuantity(book.getQuantity() - 1);

			bookRepository.save(book);

			// Tao record muon
			BorrowRecord record = //
					new BorrowRecord();

			record.setMember(member);

			record.setBook(book);

			record.setBorrowDate(LocalDate.now());

			record.setReturnDate(null);

			record.setStatus(BorrowStatus.BORROWED);

			BorrowRecord savedRecord = //
					borrowRecordRepository.save(record);

			responses.add(toResponse(savedRecord));
		}

		return responses;
	}

	// =========================
	// SACH TOI DANG MUON
	// =========================

	@Transactional
	public List<BorrowResponse> getBorrowedBooksByEmail(String email) {

		Member member = //
				getMemberByEmail(email);

		return borrowRecordRepository.findByMember_Id(member.getId()).stream().filter(record -> //
		record.getStatus() == BorrowStatus.BORROWED//
		).map(this::toResponse).toList();
	}

	// =========================
	// TRA SACH
	// =========================

	@Transactional
	public BorrowResponse returnBook(String email, Long borrowRecordId) {

		// Member dang login
		Member member = //
				getMemberByEmail(email);

		// Tim record
		BorrowRecord record = //
				borrowRecordRepository.findById(borrowRecordId).orElseThrow(() -> //
				new ResourceNotFoundException("Không tìm thấy phiếu mượn!"));

		/*
		 * Khong cho user tra sach cua member khac.
		 */
		if (!record.getMember().getId().equals(member.getId())) {

			throw new BadRequestException("Bạn không thể trả sách của member khác!");
		}

		if (record.getStatus() == BorrowStatus.RETURNED) {

			throw new BadRequestException("Sách này đã được trả!");
		}

		// Cap nhat record
		record.setReturnDate(LocalDate.now());

		record.setStatus(BorrowStatus.RETURNED);

		// Cong lai kho
		Book book = //
				record.getBook();

		book.setQuantity(book.getQuantity() + 1);

		bookRepository.save(book);

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