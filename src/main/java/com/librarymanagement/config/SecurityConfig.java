package com.librarymanagement.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.librarymanagement.security.JwtAuthencationFilter;

@Configuration
public class SecurityConfig {

	private final JwtAuthencationFilter jwtAuthencationFilter;

	public SecurityConfig(JwtAuthencationFilter jwtAuthencationFilter) {
		this.jwtAuthencationFilter = jwtAuthencationFilter;
	}

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http.csrf(csrf -> csrf.disable()).sessionManagement(session -> //
		// stateless = tức server không giữ session của user
		session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))//

				.authorizeHttpRequests(auth -> //
				// 3url này không cần jwt (chưa có tài khoản thì register,login, error,..)
				auth.requestMatchers("/auth/register", "/error", //
						"/auth/login", //
						"/auth/verify-email", //
						"/auth/forgot-password", //
						"/auth/reset-password").permitAll()//
						.requestMatchers("/api/admin/**")//
						.hasRole("ADMIN")//
						//
						.requestMatchers("/api/user/**")//
						.hasAnyRole("USER", "ADMIN")//

						.anyRequest()//
						.authenticated())// cái nào k có permitall thì phải xác thực dưới anyrole ở dưới
				// Mọi API còn lại phải được xác thực.ex: api/test phải có xác thực
				.formLogin(form -> form.disable())// tắt form login system
				.addFilterBefore(// Cho JWT Filter của mình chạy trước filter login mặc định của spring
									// security
						jwtAuthencationFilter, //
						UsernamePasswordAuthenticationFilter.class);//// Đặt filter JWT của mình trước filter này

		return http.build();
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}
}
