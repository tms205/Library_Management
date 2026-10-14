package com.librarymanagement.dto.response;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MemberResponse {

	private Long id;
	private String fullName;
	private LocalDate dateOfBirth;
	private String phone;
	private String address;
	private Long accountId;
	private String email;
}
