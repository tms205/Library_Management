package com.librarymanagement.dto.response;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonProperty;

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
	private Boolean enabled;

	@JsonProperty("is_delete")
	private Integer is_delete;

	// Constructor tương thích ngược với code và unit test cũ (7 tham số)
	public MemberResponse(
			Long id,
			String fullName,
			LocalDate dateOfBirth,
			String phone,
			String address,
			Long accountId,
			String email) {
		this(id, fullName, dateOfBirth, phone, address, accountId, email, true, 0);
	}

	// Constructor tương thích ngược (8 tham số)
	public MemberResponse(
			Long id,
			String fullName,
			LocalDate dateOfBirth,
			String phone,
			String address,
			Long accountId,
			String email,
			Boolean enabled) {
		this(id, fullName, dateOfBirth, phone, address, accountId, email, enabled, 0);
	}

	@JsonProperty("isDelete")
	public Integer getIsDelete() {
		return is_delete != null ? is_delete : 0;
	}
}
