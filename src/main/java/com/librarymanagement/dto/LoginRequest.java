package com.librarymanagement.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequest {
	@NotBlank(message = "Email không được để trống!")
	@Email(message = "Email sai định dạng!")
	private String email;

	@NotBlank(message = "Mật khẩu không được để trống!")
	private String password;

}
