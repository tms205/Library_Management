package com.librarymanagement.dto.request;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BorrowBookRequest {

	@NotEmpty(message = "Danh sách sách không được để trống!")
	private List<@NotNull(message = "Book ID không được để trống!") @Positive(message = "Book ID phải lớn hơn 0!") Long> bookIds;

	// Khóa Idempotency tùy chọn từ client nhằm chống gửi trùng / retry tạo trùng đơn mượn
	private String requestId;
}
