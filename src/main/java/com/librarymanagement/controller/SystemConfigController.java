package com.librarymanagement.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.librarymanagement.dto.request.BorrowDurationRequest;
import com.librarymanagement.dto.request.MaintenanceRequest;
import com.librarymanagement.entity.SystemConfig;
import com.librarymanagement.service.SystemConfigService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/system-config")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "System Config Controller", description = "Các API cấu hình vận hành và chính sách hệ thống (chỉ dành cho Admin)")
public class SystemConfigController {

	private final SystemConfigService systemConfigService;

	public SystemConfigController(SystemConfigService systemConfigService) {
		this.systemConfigService = systemConfigService;
	}

	// Lấy cấu hình hệ thống hiện tại
	@GetMapping
	@Operation(summary = "Lấy các tham số cấu hình hệ thống hiện tại")
	public SystemConfig getConfig() {
		return systemConfigService.getConfig();
	}

	// Bật / tắt chế độ bảo trì
	@PutMapping("/maintenance")
	@Operation(summary = "Bật hoặc tắt chế độ bảo trì hệ thống")
	public SystemConfig updateMaintenance(//
			@Valid @RequestBody MaintenanceRequest request) {
		return systemConfigService.updateMaintenance(request);
	}

	// Cập nhật cấu hình thời hạn mượn sách động
	@PutMapping("/borrow-duration")
	@Operation(summary = "Cấu hình thời hạn mượn sách mặc định (tính theo ngày)")
	public SystemConfig updateBorrowDuration(
			@Valid @RequestBody BorrowDurationRequest request) {
		return systemConfigService.updateBorrowDuration(request);
	}
}
