package com.librarymanagement.service;

import java.time.LocalDate;

import org.springframework.stereotype.Service;

import com.librarymanagement.dto.BorrowBookRequest;
import com.librarymanagement.entity.Book;
import com.librarymanagement.entity.BorrowRecord;
import com.librarymanagement.entity.BorrowStatus;
import com.librarymanagement.entity.Member;
import com.librarymanagement.exception.BookNotFoundException;
import com.librarymanagement.exception.BorrowException;
import com.librarymanagement.repository.BookRepository;
import com.librarymanagement.repository.BorrowRecordRepository;
import com.librarymanagement.repository.MemberRepository;

import jakarta.transaction.Transactional;

@Service
public class BorrowService {

	private final BorrowRecordRepository borrowRecordRepository;
	private final MemberRepository memberRepository;
	private final BookRepository bookRepository;

	public BorrowService(BorrowRecordRepository borrowRecordRepository, //
			MemberRepository memberRepository, //
			BookRepository bookRepository//
	) {

		this.borrowRecordRepository = borrowRecordRepository;
		this.memberRepository = memberRepository;
		this.bookRepository = bookRepository;

	}

	@Transactional
	public BorrowRecord borrowBook(BorrowBookRequest request) {
		// 1.find member
		Member member = memberRepository.findById(request.getMemberId())//
				.orElseThrow(() -> //
				new BorrowException("Không tìm thấy member có id: " + request.getMemberId()));

		// 2.find book
		Book book = bookRepository.findById(request.getBookId())//
				.orElseThrow(() -> //
				new BookNotFoundException("Không tìm thấy sách!"));

		// check quantity book
		if (book.getQuantity() <= 0) {
			throw new BorrowException("Sách đã hết!");
		}

		// check member có đang mượn sách kh
		boolean isBorrowing = borrowRecordRepository//
				.existsByMember_IdAndStatus(member.getId(), BorrowStatus.BORROWED);

		if (isBorrowing) {
			throw new BorrowException("Member đang mượn sách, không thể mượn thêm!!");
		}

		// 5. trừ sl sách
		book.setQuantity(book.getQuantity() - 1);

		// 6. create phieeus muownj

		BorrowRecord record = new BorrowRecord();

		record.setMember(member);
		record.setBook(book);
		record.setBorrowDate(LocalDate.now());
		record.setReturnDate(null);
		record.setStatus(BorrowStatus.BORROWED);

		// 7.save

		bookRepository.save(book);

		return borrowRecordRepository.save(record);

	}

	@Transactional
	public BorrowRecord returnBook(Long borrowRecordId) {

		BorrowRecord record = borrowRecordRepository.findById(borrowRecordId)
				.orElseThrow(() -> new BorrowException("Không tìm thấy phiếu mượn!"));

		if (record.getStatus() == BorrowStatus.RETURNED) {
			throw new BorrowException("Sách này đã được trả!");
		}

		record.setReturnDate(LocalDate.now());
		record.setStatus(BorrowStatus.RETURNED);

		Book book = record.getBook();
		book.setQuantity(book.getQuantity() + 1);

		bookRepository.save(book);

		return borrowRecordRepository.save(record);
	}
}
