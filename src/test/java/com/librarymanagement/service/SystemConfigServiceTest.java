package com.librarymanagement.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.librarymanagement.dto.request.BorrowDurationRequest;
import com.librarymanagement.entity.SystemConfig;
import com.librarymanagement.exception.BadRequestException;
import com.librarymanagement.repository.SystemConfigRepository;

class SystemConfigServiceTest {

	private SystemConfigRepository systemConfigRepository;
	private SystemConfigService systemConfigService;

	private SystemConfig mockConfig;

	@BeforeEach
	void setUp() {
		systemConfigRepository = mock(SystemConfigRepository.class);
		systemConfigService = new SystemConfigService(systemConfigRepository);

		mockConfig = new SystemConfig();
		mockConfig.setId(1L);
		mockConfig.setMaintenanceMode(false);
		mockConfig.setBorrowDurationDays(7);

		when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(mockConfig));
		when(systemConfigRepository.save(any(SystemConfig.class))).thenAnswer(i -> i.getArgument(0));
	}

	@Test
	@DisplayName("getBorrowDurationDays should return 7 by default")
	void testGetBorrowDurationDays_Default() {
		int days = systemConfigService.getBorrowDurationDays();
		assertEquals(7, days);
	}

	@Test
	@DisplayName("getBorrowDurationDays should return configured value when set")
	void testGetBorrowDurationDays_Custom() {
		mockConfig.setBorrowDurationDays(21);
		int days = systemConfigService.getBorrowDurationDays();
		assertEquals(21, days);
	}

	@Test
	@DisplayName("updateBorrowDuration should successfully update duration to 14 days")
	void testUpdateBorrowDuration_Success() {
		BorrowDurationRequest req = new BorrowDurationRequest(14);
		SystemConfig updated = systemConfigService.updateBorrowDuration(req);

		assertEquals(14, updated.getBorrowDurationDays());
		verify(systemConfigRepository).save(mockConfig);
	}

	@Test
	@DisplayName("updateBorrowDuration should throw BadRequestException when days is 0")
	void testUpdateBorrowDuration_ZeroDaysThrows() {
		BorrowDurationRequest req = new BorrowDurationRequest(0);
		assertThrows(BadRequestException.class, () -> systemConfigService.updateBorrowDuration(req));
	}

	@Test
	@DisplayName("updateBorrowDuration should throw BadRequestException when days is negative")
	void testUpdateBorrowDuration_NegativeDaysThrows() {
		BorrowDurationRequest req = new BorrowDurationRequest(-5);
		assertThrows(BadRequestException.class, () -> systemConfigService.updateBorrowDuration(req));
	}

	@Test
	@DisplayName("updateBorrowDuration should throw BadRequestException when days > 365")
	void testUpdateBorrowDuration_ExceedLimitThrows() {
		BorrowDurationRequest req = new BorrowDurationRequest(400);
		assertThrows(BadRequestException.class, () -> systemConfigService.updateBorrowDuration(req));
	}
}
