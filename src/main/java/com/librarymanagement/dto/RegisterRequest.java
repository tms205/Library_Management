package com.librarymanagement.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

	@NotBlank(message = "Email không được để trống")
	@Email(message = "Email không đúng định dạng")
	private String email;

	@NotBlank(message = "Mật khẩu không được để trống")
	@Size(min = 4, message = "Mật khẩu phải có ít nhất 4 ký tự")
	private String password;

	@NotBlank(message = "Họ tên không được để trống")
	private String fullName;

	@NotNull(message = "Ngày sinh không được để trống")
	@Past(message = "Ngày sinh phải là ngày trong quá khứ")
	private LocalDate dateOfBirth;

	@NotBlank(message = "Số điện thoại không được để trống")
	@Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại phải gồm 10 số và bắt đầu bằng 0")
	private String phone;

	@NotBlank(message = "Địa chỉ không được để trống")
	private String address;
}