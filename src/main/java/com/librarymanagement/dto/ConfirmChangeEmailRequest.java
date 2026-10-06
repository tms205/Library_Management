package com.librarymanagement.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ConfirmChangeEmailRequest {
	@NotBlank(message = "Mã xác minh không được để trống!")
	@Pattern(regexp = "^\\d{6}$", message = "Mã xác minh phải 6 chữ số!")

	private String code;
}
