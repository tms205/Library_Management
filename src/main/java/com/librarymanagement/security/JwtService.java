package com.librarymanagement.security;

import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.librarymanagement.entity.Account;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {
	@Value("${jwt.secret}")
	private String secret;// khóa bí mật

	@Value("${jwt.expiration}") // lấy từ trong application.properties
	private long expiration;// thời hạn của khóa

	private SecretKey getSigningKey() {// tạo khóa bí mật của server
		byte[] keyBytes = Decoders.BASE64.decode(secret);
		// Lý do phải Base64: khóa bí mật thường chứa ký tự nhị phân không in được,
		// nên người ta lưu dưới dạng Base64 cho an toàn khi đọc từ file cấu hình.
		return Keys.hmacShaKeyFor(keyBytes);// là hàm tiện ích của JJWT.
	}

	public String generateToken(Account account) {// tạo token jwt
		return Jwts.builder().subject(account.getEmail())// token này thuộc về ai
				.claim("role", account.getRole().name())// dữ liệu thêm mình nhét vào token
				.issuedAt(new Date())// thời điểm được tạo
				.expiration(// thời điểm hết hạn token
						new Date(System.currentTimeMillis() + expiration))
				.signWith(getSigningKey())// ký token = secret key
				.compact();
	}

	private Claims extractAllClaims(String token) {// lấy toàn bộ thông tin bên trong token
		return Jwts.parser()// tạo công cụ để đọc và phân tích jwt
				.verifyWith(getSigningKey())// kiểm tra chữ ký jwt bằng đúng secret key
				.build()// tạo parser hoàn chỉnh từ cấu hình vừa thiết lập
				.parseSignedClaims(token)// đọc 1 jwt đã được ký và lấy phần claims của nó
				.getPayload();// Lấy phần dữ liệu bên trong token.
	}

	public String extractEmail(String token) {
		return extractAllClaims(token).getSubject();//
	}

	public String extractRole(String token) {
		return extractAllClaims(token).get("role", String.class);// lấy claim có tên role và kiểu trả về string

	}

	public boolean isTokenValid(String token) {// check token có hợp lệ không
		Date expirationDate = extractAllClaims(token).getExpiration();

		return expirationDate.after(new Date());
	}
}
