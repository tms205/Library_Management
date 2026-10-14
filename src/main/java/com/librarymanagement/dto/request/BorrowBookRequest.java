package com.librarymanagement.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BorrowBookRequest {

	@NotNull(message = "Member ID không được để trống!")
	private Long memberId;

	@NotNull(message = "Book ID không được để trống!")
	private Long bookId;
}
