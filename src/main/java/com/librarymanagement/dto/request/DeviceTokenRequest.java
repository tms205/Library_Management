package com.librarymanagement.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DeviceTokenRequest {

	@NotBlank(message = "Token không được để trống!")
	private String token;

	@NotBlank(message = "Platform không được để trống!")
	private String platform; // "ANDROID" hoặc "IOS"

	private String deviceId;
}
