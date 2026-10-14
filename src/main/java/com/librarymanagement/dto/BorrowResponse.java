package com.librarymanagement.dto;

import java.time.LocalDate;

import com.librarymanagement.entity.BorrowStatus;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class BorrowResponse {

	private Long id;

	private Long memberId;
	private String memberName;

	private Long bookId;
	private String bookTitle;

	private LocalDate borrowDate;
	private LocalDate returnDate;

	private BorrowStatus status;
}
