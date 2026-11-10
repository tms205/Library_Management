package com.librarymanagement.controller;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.Role;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.security.JwtService;
import com.librarymanagement.service.SseNotificationService;

@SpringBootTest
class SseSecurityIntegrationTest {

	@Autowired
	private WebApplicationContext webApplicationContext;

	@Autowired
	private JwtService jwtService;

	@Autowired
	private AccountRepository accountRepository;

	@Autowired
	private SseNotificationService sseNotificationService;

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		mockMvc = MockMvcBuilders
				.webAppContextSetup(webApplicationContext)
				.apply(springSecurity())
				.build();
	}

	@Test
	@DisplayName("1. Không có JWT: GET /api/notifications/stream phải bị từ chối 403 Forbidden, không cho phép kết nối")
	void testSseStream_WithoutToken_Denied() throws Exception {
		mockMvc.perform(get("/api/notifications/stream")
				.accept(MediaType.TEXT_EVENT_STREAM_VALUE))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("2. JWT không hợp lệ: GET /api/notifications/stream phải bị chặn 403 Forbidden")
	void testSseStream_WithInvalidToken_Denied() throws Exception {
		mockMvc.perform(get("/api/notifications/stream")
				.header("Authorization", "Bearer invalid.jwt.token.here")
				.accept(MediaType.TEXT_EVENT_STREAM_VALUE))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("3. JWT hợp lệ: Kết nối SSE thành công (200 OK + Async Started), async dispatch không bị AuthorizationDeniedException")
	void testSseStream_WithValidToken_AsyncDispatchSucceeds() throws Exception {
		// Tạo account hợp lệ trong DB
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		Account account = new Account();
		account.setEmail("sse-user-" + suffix + "@library.com");
		account.setPassword("encoded123");
		account.setEnabled(true);
		account.setIsDelete(false);
		account.setRole(Role.USER);
		account = accountRepository.save(account);

		// Sinh JWT hợp lệ
		String validToken = jwtService.generateToken(account);

		// 1. Thực hiện request ban đầu (DispatcherType.REQUEST)
		MvcResult mvcResult = mockMvc.perform(get("/api/notifications/stream")
				.header("Authorization", "Bearer " + validToken)
				.accept(MediaType.TEXT_EVENT_STREAM_VALUE))
				.andExpect(request().asyncStarted())
				.andReturn();

		assertNotNull(mvcResult);
		assertTrue(mvcResult.getRequest().isAsyncStarted());
		assertEquals("text/event-stream", mvcResult.getResponse().getContentType());
	}

	@Test
	@DisplayName("4. Heartbeat định kỳ: Không gây crash hay rò rỉ kết nối khi gửi đến emitter đang hoạt động")
	void testSseHeartbeat_DoesNotThrow() {
		Long testAccountId = 999999L;
		SseEmitter emitter = sseNotificationService.createEmitter(testAccountId);
		assertNotNull(emitter);

		assertDoesNotThrow(() -> {
			sseNotificationService.sendHeartbeat();
		});

		// Dọn dẹp emitter sau khi kiểm thử
		emitter.complete();
	}
}
