package com.librarymanagement.security;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthencationFilter extends OncePerRequestFilter {// mỗi request chạy filter này 1 lần(once)
	private final JwtService jwtService;

	private final TokenBlacklistService tokenBlacklistService;

	// dependency injection
	public JwtAuthencationFilter(//
			JwtService jwtService, //
			TokenBlacklistService tokenBlacklistService) {// khai báo với khởi tạo
		this.jwtService = jwtService;
		this.tokenBlacklistService = tokenBlacklistService;
	}

	@Override // code mà filter sẽ chạy mỗi khi có request đi qua
	protected void doFilterInternal(HttpServletRequest request, // request mà client gửi lên
			HttpServletResponse response, // response mà server trả về
			FilterChain filterChain)// chuỗi filter tiếp theo
			throws ServletException, IOException {

		String authorizationHeader = request.getHeader("Authorization");// lấy header authorization từ request
		//// nếu không có Authorization Header, hoặc Header không bắt đầu bằng "Bearer
		//// ".
		if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
			filterChain.doFilter(request, response);
			return;
		}
		// B e a r e r _
		// 1 2 3 4 5 6 7 tức là bỏ 7 kí tự đầu
		String token = authorizationHeader.substring(7);

		// check token da het han chua
		if (tokenBlacklistService.isBlacklisted(token)) {
			SecurityContextHolder.clearContext();
			filterChain.doFilter(request, response);
			return;
		}
		try {// vì token có thể hết hạn, sửa, sai chữ ký, sai format
				//
			if (jwtService.isTokenValid(token)) {// xét tính hợp lệ của token
				String email = jwtService.extractEmail(token);// ai->manh27062005@gmail.com

				String role = jwtService.extractRole(token);// quyền -> user

				SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + role);// authority: quyền

				UsernamePasswordAuthenticationToken authentication = // biểu diễn người này đã xác thực
						new UsernamePasswordAuthenticationToken(email, // ai đăng ngập
								null, // password k cần vì jwt đã chứng minh request này r
								List.of(authority));//// danh sách quyền

				SecurityContextHolder.getContext().setAuthentication(authentication);
				// securitycontextholder = nơi spring security giữ thông tin đăng nhập trong
				// request hiện tại

			}
		} catch (Exception e) {
			// TODO: handle exception
			// nếu token lỗi -> clearcontext = xóa thông tin đăng nhập
			SecurityContextHolder.clearContext();
		}
		// filter này xử lý xong rồi, cho request đi tiếp sang filter/controller
		// tiếp theo
		filterChain.doFilter(request, response);
	}
}
