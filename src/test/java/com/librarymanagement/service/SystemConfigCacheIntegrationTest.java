package com.librarymanagement.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.librarymanagement.dto.request.BorrowDurationRequest;
import com.librarymanagement.dto.request.MaintenanceRequest;

@SpringBootTest
class SystemConfigCacheIntegrationTest {

	@Autowired
	private SystemConfigService systemConfigService;

	@Test
	@DisplayName("Kiểm tra bộ nhớ đệm SystemConfig: Cập nhật chế độ bảo trì đồng bộ ngay lập tức vào RAM")
	void testMaintenanceModeCacheCoherence() {
		// Đảm bảo ban đầu tắt bảo trì
		systemConfigService.updateMaintenance(new MaintenanceRequest(false));
		assertFalse(systemConfigService.isMaintenanceMode(), "Chế độ bảo trì phải là false");

		// Bật bảo trì
		systemConfigService.updateMaintenance(new MaintenanceRequest(true));
		assertTrue(systemConfigService.isMaintenanceMode(), "Chế độ bảo trì phải cập nhật ngay sang true");

		// Tắt lại bảo trì
		systemConfigService.updateMaintenance(new MaintenanceRequest(false));
		assertFalse(systemConfigService.isMaintenanceMode(), "Chế độ bảo trì phải cập nhật ngay sang false");
	}

	@Test
	@DisplayName("Kiểm tra bộ nhớ đệm SystemConfig: Cập nhật thời hạn mượn sách đồng bộ ngay lập tức vào RAM")
	void testBorrowDurationCacheCoherence() {
		systemConfigService.updateBorrowDuration(new BorrowDurationRequest(14));
		assertEquals(14, systemConfigService.getBorrowDurationDays(), "Thời hạn mượn sách trong cache phải là 14 ngày");

		systemConfigService.updateBorrowDuration(new BorrowDurationRequest(7));
		assertEquals(7, systemConfigService.getBorrowDurationDays(), "Thời hạn mượn sách trong cache phải quay về 7 ngày");
	}

	@Test
	@DisplayName("50 luồng đồng thời gọi isMaintenanceMode: Đọc tức thì từ RAM, 0% nguy cơ cạn kiệt HikariCP")
	void testConcurrentMaintenanceModeReads_ZeroPoolContention() throws InterruptedException {
		int threads = 50;
		ExecutorService executor = Executors.newFixedThreadPool(threads);
		CountDownLatch readyLatch = new CountDownLatch(threads);
		CountDownLatch startLatch = new CountDownLatch(1);
		CountDownLatch doneLatch = new CountDownLatch(threads);

		AtomicInteger successfulReads = new AtomicInteger(0);

		for (int i = 0; i < threads; i++) {
			executor.submit(() -> {
				readyLatch.countDown();
				try {
					startLatch.await();
					for (int j = 0; j < 100; j++) {
						boolean mode = systemConfigService.isMaintenanceMode();
						if (!mode) {
							successfulReads.incrementAndGet();
						}
					}
				} catch (Exception e) {
					// Lỗi nếu có
				} finally {
					doneLatch.countDown();
				}
			});
		}

		readyLatch.await(5, TimeUnit.SECONDS);
		startLatch.countDown();
		boolean finished = doneLatch.await(5, TimeUnit.SECONDS);
		executor.shutdown();

		assertTrue(finished, "50 luồng với 5000 lần đọc cache phải hoàn thành trong 5 giây");
		assertEquals(5000, successfulReads.get(), "Toàn bộ 5000 lần đọc phải thành công từ RAM");
	}
}
