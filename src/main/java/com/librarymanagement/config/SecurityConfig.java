package com.librarymanagement.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.librarymanagement.security.JwtAuthencationFilter;
import com.librarymanagement.security.MaintenanceModeFilter;
import com.librarymanagement.service.SystemConfigService;

@Configuration
public class SecurityConfig {

	private final JwtAuthencationFilter jwtAuthencationFilter;

	private final SystemConfigService systemConfigService;

	public SecurityConfig(//
			JwtAuthencationFilter jwtAuthencationFilter, //
			SystemConfigService systemConfigService) {

		this.jwtAuthencationFilter = jwtAuthencationFilter;
		this.systemConfigService = systemConfigService;
	}

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

		http
				// Cho phép frontend React gọi sang backend
				.cors(cors -> //
				cors.configurationSource(//
						corsConfigurationSource()//
				)//
				)

				// Dùng JWT nên tắt CSRF
				.csrf(csrf -> csrf.disable())//

				// Server không lưu session đăng nhập
				.sessionManagement(session -> //
				session.sessionCreationPolicy(//
						SessionCreationPolicy.STATELESS//
				)//
				)

				.authorizeHttpRequests(auth -> auth//

						// swagger
						.requestMatchers(//
								"/swagger-ui/**", //
								"/swagger-ui.html", //
								"/v3/api-docs/**"//
						).permitAll()

						// AUTH - KHÔNG CẦN JWT
						.requestMatchers(//
								"/auth/register", //
								"/auth/login", //
								"/auth/verify-email", //
								"/auth/forgot-password", //
								"/auth/reset-password", //
								"/auth/refresh", //
								"/error"//
						)//
						.permitAll()//

						// BOOK PERMISSIONS
						// Xem / tìm kiếm sách
						.requestMatchers(//
								HttpMethod.GET, //
								"/api/books/**"//
						)//
						.hasAuthority("BOOK_VIEW")//

						// Import CSV
						// Phải để trước BOOK_CREATE
						.requestMatchers(//
								HttpMethod.POST, //
								"/api/books/import"//
						)//
						.hasAuthority("BOOK_IMPORT")//

						// Thêm sách
						.requestMatchers(//
								HttpMethod.POST, //
								"/api/books/**"//
						)//
						.hasAuthority("BOOK_CREATE")//

						// Sửa sách
						.requestMatchers(//
								HttpMethod.PUT, //
								"/api/books/**"//
						)//
						.hasAuthority("BOOK_UPDATE")//

						// Xóa sách
						.requestMatchers(//
								HttpMethod.DELETE, //
								"/api/books/**"//
						)//
						.hasAuthority("BOOK_DELETE")//

						// MEMBER PERMISSION
						// Xem / search
						.requestMatchers(//
								HttpMethod.GET, //
								"/api/members/**"//
						)//
						.hasAuthority("MEMBER_VIEW")//

						// add member
						.requestMatchers(//
								HttpMethod.POST, //
								"/api/members", //
								"/api/members/**"//
						)//
						.hasAuthority("MEMBER_CREATE")//

						// update member
						.requestMatchers(//
								HttpMethod.PUT, //
								"/api/members/**"//
						)//
						.hasAuthority("MEMBER_UPDATE")//

						// delete member
						.requestMatchers(//
								HttpMethod.DELETE, //
								"/api/members/**"//
						)//
						.hasAuthority("MEMBER_DELETE")//

						// BORROW / RETURN PERMISSIONS
						// muon sach
						.requestMatchers(//
								HttpMethod.POST, //
								"/api/borrow/**"//
						)//
						.hasAuthority("BORROW_BOOK")//

						// tra sach
						.requestMatchers(//
								HttpMethod.PUT, //
								"/api/borrow/**"//
						)//
						.hasAuthority("RETURN_BOOK")//

						// MAINTENANCE
						.requestMatchers(//
								"/api/system-config/**"//
						)//
						.hasAuthority("SYSTEM_MAINTENANCE")//

						// API KHÁC
						.anyRequest()//
						.authenticated()//
				)//

				// Không dùng form login mặc định của Spring
				.formLogin(form -> form.disable())//

				// JWT Filter chạy trước filter login mặc định
				.addFilterBefore(//
						jwtAuthencationFilter, //
						UsernamePasswordAuthenticationFilter.class//
				)//

				.addFilterAfter(//
						new MaintenanceModeFilter(systemConfigService), //
						JwtAuthencationFilter.class//
				);

		return http.build();//
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	public CorsConfigurationSource corsConfigurationSource() {

		CorsConfiguration configuration = new CorsConfiguration();

		// Frontend Vite
		configuration.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:5174"));

		configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

		configuration.setAllowedHeaders(List.of("*"));

		configuration.setAllowCredentials(true);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

		source.registerCorsConfiguration("/**", configuration);

		return source;
	}
}