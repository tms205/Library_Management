package com.librarymanagement.security;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import com.librarymanagement.service.SystemConfigService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class MaintenanceModeFilter extends OncePerRequestFilter {

	private final SystemConfigService systemConfigService;

	public MaintenanceModeFilter(SystemConfigService systemConfigService) {
		this.systemConfigService = systemConfigService;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {
		// Bỏ qua các dispatch nội bộ không phải request ban đầu (ASYNC / ERROR / FORWARD)
		if (request.getDispatcherType() != jakarta.servlet.DispatcherType.REQUEST) {
			filterChain.doFilter(request, response);
			return;
		}

		String path = request.getRequestURI();

		// Bỏ qua các đường dẫn cấu hình, đăng nhập, tài liệu API và CORS preflight OPTIONS
		if ("OPTIONS".equalsIgnoreCase(request.getMethod())
				|| path.startsWith("/api/system-config")//
				|| path.equals("/auth/login")//
				|| path.equals("/api/auth/login")//
				|| path.startsWith("/swagger-ui")//
				|| path.startsWith("/v3/api-docs")//
				|| path.startsWith("/error")) {//

			filterChain.doFilter(request, response);
			return;
		}

		// Đọc cờ bảo trì từ in-memory cache (0 database connection, 0 JPA transaction)
		if (systemConfigService.isMaintenanceMode()) {
			// Cho phép tài khoản Quản trị viên (có quyền SYSTEM_MAINTENANCE hoặc ROLE_ADMIN) truy cập để xử lý bảo trì
			Authentication auth = SecurityContextHolder.getContext().getAuthentication();
			boolean isPrivileged = auth != null && auth.getAuthorities().stream()
					.anyMatch(a -> a.getAuthority().equals("SYSTEM_MAINTENANCE")
							|| a.getAuthority().equals("ROLE_ADMIN")
							|| a.getAuthority().equals("ADMIN"));

			if (!isPrivileged) {
				response.setStatus(HttpStatus.SERVICE_UNAVAILABLE.value());
				response.setContentType(MediaType.APPLICATION_JSON_VALUE);
				response.setCharacterEncoding("UTF-8");
				response.getWriter().write("{\"message\":\"Hệ thống đang bảo trì!\"}");
				return;
			}
		}

		filterChain.doFilter(request, response);
	}
}
