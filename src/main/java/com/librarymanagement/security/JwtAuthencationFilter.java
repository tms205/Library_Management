package com.librarymanagement.security;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.librarymanagement.repository.AccountRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthencationFilter extends OncePerRequestFilter {

	private final JwtService jwtService;

	private final TokenBlacklistService tokenBlacklistService;

	private final AccountRepository accountRepository;

	@Autowired
	public JwtAuthencationFilter(
			JwtService jwtService,
			TokenBlacklistService tokenBlacklistService,
			AccountRepository accountRepository) {

		this.jwtService = jwtService;
		this.tokenBlacklistService = tokenBlacklistService;
		this.accountRepository = accountRepository;
	}

	// Constructor tương thích ngược cho unit test
	public JwtAuthencationFilter(JwtService jwtService, TokenBlacklistService tokenBlacklistService) {
		this(jwtService, tokenBlacklistService, null);
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {

		// Lay Authorization Header
		String authorizationHeader = request.getHeader("Authorization");

		// Neu khong co Bearer token thi cho request di tiep
		if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {

			filterChain.doFilter(request, response);
			return;
		}

		// Bo "Bearer " lay JWT
		String token = authorizationHeader.substring(7);

		// Neu token da logout / blacklist
		if (tokenBlacklistService.isBlacklisted(token)) {

			SecurityContextHolder.clearContext();

			filterChain.doFilter(request, response);
			return;
		}

		try {

			// Kiem tra token con hop le
			if (jwtService.isTokenValid(token)) {

				// Lay email tu token
				String email = jwtService.extractEmail(token);

				// Quan trọng: Kiểm tra xem tài khoản có bị khóa trong database hay không
				// Tránh trường hợp user đang giữ JWT cũ chưa hết hạn nhưng tài khoản đã bị khóa hoặc bị xóa mềm
				if (accountRepository != null) {
					var accountOpt = accountRepository.findByEmail(email);
					if (accountOpt.isEmpty() || Boolean.FALSE.equals(accountOpt.get().getEnabled())
							|| Boolean.TRUE.equals(accountOpt.get().getIsDelete())) {
						SecurityContextHolder.clearContext();
						response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
						response.setContentType("application/json;charset=UTF-8");
						response.getWriter().write("{\"message\": \"Tài khoản của bạn đã bị xóa hoặc bị khóa! Vui lòng liên hệ thủ thư để được hỗ trợ.\"}");
						return;
					}
				}

				// Lay danh sach permission tu token
				List<String> permissions = jwtService.extractPermissions(token);

				/*
				 * Chuyen:
				 *
				 * BOOK_VIEW BOOK_CREATE BOOK_UPDATE
				 *
				 * thanh GrantedAuthority cua Spring Security
				 */
				List<SimpleGrantedAuthority> authorities = permissions.stream()//
						.map(SimpleGrantedAuthority::new)//
						.toList();

				/*
				 * Tao Authentication
				 *
				 * principal = email password = null authorities = danh sach permission
				 */
				UsernamePasswordAuthenticationToken authentication = //
						new UsernamePasswordAuthenticationToken(email, //
								null, authorities);

				// Luu Authentication vao SecurityContext
				SecurityContextHolder.getContext()//
						.setAuthentication(authentication);
			}

		} catch (Exception e) {

			// Token sai / het han / chu ky sai...
			SecurityContextHolder.clearContext();
		}

		// Cho request di tiep
		filterChain.doFilter(request, response);
	}
}