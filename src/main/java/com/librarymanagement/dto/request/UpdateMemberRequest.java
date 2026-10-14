package com.librarymanagement.dto.request;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateMemberRequest {

	@NotBlank(message = "Họ tên không được để trống!")
	private String fullName;

	@NotNull(message = "Ngày sinh không được để trống!")
	@Past(message = "Ngày sinh phải nhỏ hơn ngày hiện tại!")
	private LocalDate dateOfBirth;

	@NotBlank(message = "Số điện thoại không được để trống!")
	@Pattern(regexp = "^[0-9]{10,11}$", message = "Số điện thoại không hợp lệ!")
	private String phone;

	@NotBlank(message = "Địa chỉ không được để trống!")
	private String address;
}
