package com.librarymanagement.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ForgotPasswordRequest {

	@NotBlank(message = "Email không được để trống!")
	@Email(message = "Email không đúng định dạng!")
	private String email;
}
