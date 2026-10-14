package com.librarymanagement.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateBookRequest {
	@NotBlank(message = "Title không được để trống!")
	private String title;

	@NotBlank(message = "ISBN không được để trống!")
	private String isbn;

	@NotNull(message = "Số lượng không để trống!")
	@Min(value = 0, message = "Số lượng phải lớn hoặc bằng 0!")
	private Integer quantity;

	@NotNull(message = "Thời gian xuất bản không được để trống!")
	private LocalDate publishedDate;

}
