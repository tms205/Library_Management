package com.librarymanagement.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MaintenanceRequest {

	@NotNull(message = "Maintenance mode không được để trống!")
	private Boolean maintenanceMode;
}
