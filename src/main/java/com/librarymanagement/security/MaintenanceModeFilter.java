package com.librarymanagement.security;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
		String path = request.getRequestURI();

		if (path.startsWith("/api/system-config")//
				|| path.equals("/auth/login")//
				|| path.equals("/api/auth/login")//
				|| path.startsWith("/swagger-ui")//
				|| path.startsWith("/v3/api-docs")//
				|| path.startsWith("/error")) {//

			filterChain.doFilter(request, response);
			return;
		}
		if (systemConfigService.isMaintenanceMode()) {
			response.setStatus(HttpStatus.SERVICE_UNAVAILABLE.value());
			response.setContentType(MediaType.APPLICATION_JSON_VALUE);
			response.setCharacterEncoding("UTF-8");

			response.getWriter().write("{\"message\":\"Hệ thống đang bảo trì!\"}");
			return;
		}
		filterChain.doFilter(request, response);
	}

}
