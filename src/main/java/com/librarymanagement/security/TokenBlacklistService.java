package com.librarymanagement.security;

import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TokenBlacklistService {

	// Map lưu trữ: token -> thời điểm hết hạn (epoch ms)
	// Tránh rò rỉ bộ nhớ (memory leak): chỉ giữ token cho đến khi nó tự hết hạn
	private final Map<String, Long> blacklistedTokens = new ConcurrentHashMap<>();

	private final JwtService jwtService;

	// Thời gian sống mặc định của access token trong blacklist (2 giờ = 7,200,000 ms)
	private static final long DEFAULT_TTL_MS = 2 * 60 * 60 * 1000L;

	@Autowired
	public TokenBlacklistService(JwtService jwtService) {
		this.jwtService = jwtService;
	}

	// Constructor dự phòng tương thích ngược cho unit test
	public TokenBlacklistService() {
		this(null);
	}

	public void blacklist(String token) {
		if (token == null || token.isBlank()) {
			return;
		}

		long expiryTime = System.currentTimeMillis() + DEFAULT_TTL_MS;
		if (jwtService != null) {
			try {
				Date exp = jwtService.extractExpiration(token);
				if (exp != null) {
					expiryTime = exp.getTime();
				}
			} catch (Exception ignored) {
				// Nếu token giả lập trong test hoặc lỗi claim, dùng thời gian mặc định
			}
		}

		blacklistedTokens.put(token, expiryTime);
	}

	public void blacklist(String token, long expiryTimeMs) {
		if (token != null && !token.isBlank()) {
			blacklistedTokens.put(token, expiryTimeMs);
		}
	}

	public boolean isBlacklisted(String token) {
		if (token == null || token.isBlank()) {
			return false;
		}

		Long expiry = blacklistedTokens.get(token);
		if (expiry == null) {
			return false;
		}

		// Nếu token đã vượt quá hạn tự nhiên, tự động giải phóng khỏi bộ nhớ
		if (System.currentTimeMillis() > expiry) {
			blacklistedTokens.remove(token);
			return false;
		}

		return true;
	}

	// Dọn dẹp các token đã quá hạn trong blacklist
	public void cleanExpiredTokens() {
		long now = System.currentTimeMillis();
		blacklistedTokens.entrySet().removeIf(entry -> entry.getValue() <= now);
	}
}
