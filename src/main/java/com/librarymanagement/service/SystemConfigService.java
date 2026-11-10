package com.librarymanagement.service;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.dto.request.BorrowDurationRequest;
import com.librarymanagement.dto.request.MaintenanceRequest;
import com.librarymanagement.entity.SystemConfig;
import com.librarymanagement.exception.BadRequestException;
import com.librarymanagement.exception.ResourceNotFoundException;
import com.librarymanagement.repository.SystemConfigRepository;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class SystemConfigService {

	private final SystemConfigRepository systemConfigRepository;

	// In-memory atomic cache: Ngăn chặn việc truy vấn Database trên mỗi HTTP request trong Filter
	private final AtomicBoolean cachedMaintenanceMode = new AtomicBoolean(false);
	private final AtomicInteger cachedBorrowDurationDays = new AtomicInteger(7);
	private volatile boolean cacheInitialized = false;

	public SystemConfigService(SystemConfigRepository systemConfigRepository) {
		this.systemConfigRepository = systemConfigRepository;
	}

	@PostConstruct
	public void initCache() {
		refreshCache();
	}

	public synchronized void refreshCache() {
		try {
			systemConfigRepository.findFirstByOrderByIdAsc().ifPresent(config -> {
				cachedMaintenanceMode.set(Boolean.TRUE.equals(config.isMaintenanceMode()));
				if (config.getBorrowDurationDays() != null && config.getBorrowDurationDays() > 0) {
					cachedBorrowDurationDays.set(config.getBorrowDurationDays());
				}
				log.info("SystemConfig cache loaded: maintenanceMode={}, borrowDurationDays={}",
						cachedMaintenanceMode.get(), cachedBorrowDurationDays.get());
			});
			cacheInitialized = true;
		} catch (Exception e) {
			log.warn("Could not preload SystemConfig cache at startup: {}. Fallback to default.", e.getMessage());
		}
	}

	// Lấy cấu hình hệ thống hiện tại từ Database
	@Transactional(readOnly = true)
	public SystemConfig getConfig() {
		return systemConfigRepository.findFirstByOrderByIdAsc()//
				.orElseThrow(() -> //
				new ResourceNotFoundException("Không tìm thấy system config!"));
	}

	// Bật / tắt chế độ bảo trì: Ghi Database và cập nhật ngay lập tức bộ nhớ đệm
	@Transactional
	public SystemConfig updateMaintenance(MaintenanceRequest request) {
		SystemConfig config = getConfig();

		config.setMaintenanceMode(request.getMaintenanceMode());
		SystemConfig saved = systemConfigRepository.save(config);

		cachedMaintenanceMode.set(Boolean.TRUE.equals(saved.isMaintenanceMode()));
		log.info("Maintenance mode updated to: {}", cachedMaintenanceMode.get());

		return saved;
	}

	// Đọc chế độ bảo trì siêu tốc từ RAM (O(1), KHÔNG mở transaction, KHÔNG mượn connection HikariCP)
	public boolean isMaintenanceMode() {
		if (!cacheInitialized) {
			refreshCache();
		}
		return cachedMaintenanceMode.get();
	}

	// Lấy thời hạn mượn sách động từ RAM (KHÔNG mở transaction, KHÔNG mượn connection)
	public int getBorrowDurationDays() {
		if (!cacheInitialized) {
			refreshCache();
		}
		return cachedBorrowDurationDays.get();
	}

	// Cập nhật thời hạn mượn sách mới: Ghi Database và cập nhật ngay lập tức bộ nhớ đệm
	@Transactional
	public SystemConfig updateBorrowDuration(BorrowDurationRequest request) {
		if (request == null || request.getBorrowDurationDays() == null
				|| request.getBorrowDurationDays() < 1 || request.getBorrowDurationDays() > 365) {
			throw new BadRequestException("Thời hạn mượn sách phải là số nguyên dương hợp lệ từ 1 đến 365 ngày!");
		}

		SystemConfig config = getConfig();
		config.setBorrowDurationDays(request.getBorrowDurationDays());
		SystemConfig saved = systemConfigRepository.save(config);

		cachedBorrowDurationDays.set(saved.getBorrowDurationDays());
		log.info("Borrow duration updated to: {} days", cachedBorrowDurationDays.get());

		return saved;
	}
}
