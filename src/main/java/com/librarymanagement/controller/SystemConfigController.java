package com.librarymanagement.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.librarymanagement.dto.request.MaintenanceRequest;
import com.librarymanagement.entity.SystemConfig;
import com.librarymanagement.service.SystemConfigService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/system-config")
@SecurityRequirement(name = "bearerAuth")
public class SystemConfigController {

	private final SystemConfigService systemConfigService;

	public SystemConfigController(SystemConfigService systemConfigService) {
		this.systemConfigService = systemConfigService;
	}

	// get config current
	@GetMapping
	public SystemConfig getConfig() {
		return systemConfigService.getConfig();
	}

	// turn on / off maintenance
	@PutMapping("/maintenance")
	public SystemConfig updateMaintenance(//
			@Valid @RequestBody MaintenanceRequest request) {
		return systemConfigService.updateMaintenance(request);
	}
}
