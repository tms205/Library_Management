package com.librarymanagement.service;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class SseNotificationService {

	// Hỗ trợ multi-tab: Mỗi accountId có thể có nhiều SseEmitter đang mở
	private final Map<Long, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();

	private static final Long SSE_TIMEOUT = 1800000L; // 30 phút

	public SseEmitter createEmitter(Long accountId) {
		SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

		emitters.computeIfAbsent(accountId, k -> new CopyOnWriteArrayList<>()).add(emitter);

		emitter.onCompletion(() -> removeEmitter(accountId, emitter));
		emitter.onTimeout(() -> removeEmitter(accountId, emitter));
		emitter.onError((e) -> removeEmitter(accountId, emitter));

		// Gửi event khởi tạo ban đầu để client xác nhận kết nối thành công
		try {
			emitter.send(SseEmitter.event()
					.name("INIT")
					.data("SSE connection established"));
		} catch (IOException e) {
			log.warn("Failed to send INIT event to account {}: {}", accountId, e.getMessage());
			removeEmitter(accountId, emitter);
		}

		return emitter;
	}

	public void sendToAccounts(List<Long> accountIds, Object data) {
		if (accountIds == null || accountIds.isEmpty()) {
			return;
		}

		for (Long accountId : accountIds) {
			List<SseEmitter> accountEmitters = emitters.get(accountId);
			if (accountEmitters != null && !accountEmitters.isEmpty()) {
				for (SseEmitter emitter : accountEmitters) {
					try {
						emitter.send(SseEmitter.event()
								.name("NOTIFICATION")
								.data(data));
					} catch (Exception e) {
						log.debug("Error sending SSE to account {}, removing emitter: {}", accountId, e.getMessage());
						removeEmitter(accountId, emitter);
					}
				}
			}
		}
	}

	// Phát sóng thông điệp tới toàn bộ các client đang kết nối (ví dụ sự kiện thay đổi tồn kho sách)
	public void broadcast(String eventName, Object data) {
		if (eventName == null || data == null) {
			return;
		}

		emitters.forEach((accountId, accountEmitters) -> {
			for (SseEmitter emitter : accountEmitters) {
				try {
					emitter.send(SseEmitter.event()
							.name(eventName)
							.data(data));
				} catch (Exception e) {
					removeEmitter(accountId, emitter);
				}
			}
		});
	}

	// Gửi heartbeat định kỳ 25 giây để giữ kết nối không bị timeout bởi proxy / reverse proxy / firewall
	@Scheduled(fixedRate = 25000)
	public void sendHeartbeat() {
		emitters.forEach((accountId, emitterList) -> {
			for (SseEmitter emitter : emitterList) {
				try {
					emitter.send(SseEmitter.event().comment("heartbeat"));
				} catch (Exception e) {
					removeEmitter(accountId, emitter);
				}
			}
		});
	}

	private void removeEmitter(Long accountId, SseEmitter emitter) {
		List<SseEmitter> accountEmitters = emitters.get(accountId);
		if (accountEmitters != null) {
			accountEmitters.remove(emitter);
			if (accountEmitters.isEmpty()) {
				emitters.remove(accountId);
			}
		}
	}
}
