package com.librarymanagement.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChangeEmailRequest {
	@NotBlank(message = "Email mới không được để trống!")
	@Email(message = "Email mới không đúng định đạng!")
	private String newEmail;
}
