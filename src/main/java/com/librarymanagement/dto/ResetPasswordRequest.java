package com.librarymanagement.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResetPasswordRequest {
	@NotBlank(message = "Token không được để trống!")
	private String token;

	@NotBlank(message = "Mật khẩu mới không được để trống!")
	@Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự!")
	private String newPassword;
}
