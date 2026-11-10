package com.librarymanagement.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceRequest {

	@NotNull(message = "Maintenance mode không được để trống!")
	private Boolean maintenanceMode;
}
