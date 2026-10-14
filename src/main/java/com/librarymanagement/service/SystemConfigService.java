package com.librarymanagement.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.dto.MaintenanceRequest;
import com.librarymanagement.entity.SystemConfig;
import com.librarymanagement.exception.SystemConfigNotFoundException;
import com.librarymanagement.repository.SystemConfigRepository;

@Service
public class SystemConfigService {

	private final SystemConfigRepository systemConfigRepository;

	public SystemConfigService(SystemConfigRepository systemConfigRepository) {
		this.systemConfigRepository = systemConfigRepository;
	}

	// get current cofig
	@Transactional(readOnly = true)
	public SystemConfig getConfig() {
		return systemConfigRepository.findFirstByOrderByIdAsc()//
				.orElseThrow(() -> //
				new SystemConfigNotFoundException("Không tìm thấy system config!"));
	}

	// turn on / off maintenance
	@Transactional
	public SystemConfig updateMaintenance(MaintenanceRequest request) {
		SystemConfig config = getConfig();

		config.setMaintenanceMode(request.getMaintenanceMode());

		return systemConfigRepository.save(config);
	}

	@Transactional(readOnly = true)
	public boolean isMaintenanceMode() {
		return getConfig().isMaintenanceMode();
	}

}
