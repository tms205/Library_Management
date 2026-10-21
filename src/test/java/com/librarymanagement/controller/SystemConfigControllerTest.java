package com.librarymanagement.controller;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.librarymanagement.dto.request.MaintenanceRequest;
import com.librarymanagement.entity.SystemConfig;
import com.librarymanagement.service.SystemConfigService;

class SystemConfigControllerTest {

	private SystemConfigService systemConfigService;

	private SystemConfigController systemConfigController;

	@BeforeEach
	void setUp() {

		systemConfigService = org.mockito.Mockito.mock(SystemConfigService.class);

		systemConfigController = new SystemConfigController(systemConfigService);
	}

	@Test
	void getConfig_ShouldReturnCurrentConfig() {

		SystemConfig config = org.mockito.Mockito.mock(SystemConfig.class);

		when(systemConfigService.getConfig()).thenReturn(config);

		SystemConfig response = systemConfigController.getConfig();

		assertSame(config, response);

		verify(systemConfigService).getConfig();
	}

	@Test
	void updateMaintenance_ShouldReturnUpdatedConfig() {

		MaintenanceRequest request = org.mockito.Mockito.mock(MaintenanceRequest.class);

		SystemConfig config = org.mockito.Mockito.mock(SystemConfig.class);

		when(systemConfigService.updateMaintenance(request)).thenReturn(config);

		SystemConfig response = systemConfigController.updateMaintenance(request);

		assertSame(config, response);

		verify(systemConfigService).updateMaintenance(request);
	}
}