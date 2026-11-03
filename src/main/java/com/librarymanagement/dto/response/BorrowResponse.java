package com.librarymanagement.dto.response;

import java.time.LocalDate;

import com.librarymanagement.entity.BorrowStatus;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// DTO trả về thông tin phiếu mượn/trả sách, bổ sung hạn trả và tính toán quá hạn tự động
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BorrowResponse {

	private Long id;

	private Long memberId;
	private String memberName;

	private Long bookId;
	private String bookTitle;

	private LocalDate borrowDate;
	// Hạn trả sách
	private LocalDate dueDate;
	// Ngày thực tế trả sách
	private LocalDate returnDate;

	private BorrowStatus status;

	// Cờ báo hiệu sách đã bị trễ hạn hay chưa
	private Boolean isOverdue;
	// Số ngày quá hạn (nếu trễ 3 ngày thì là 3, chưa trễ thì là 0)
	private Long overdueDays;

	// Constructor tương thích ngược cho unit test và code cũ (8 tham số)
	public BorrowResponse(
			Long id,
			Long memberId,
			String memberName,
			Long bookId,
			String bookTitle,
			LocalDate borrowDate,
			LocalDate returnDate,
			BorrowStatus status) {
		this(id, memberId, memberName, bookId, bookTitle, borrowDate, null, returnDate, status, false, 0L);
	}
}
