package com.librarymanagement.security;

import java.util.Date;
import java.util.List;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.Permission;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

	@Value("${jwt.secret}")
	private String secret; // khoa bi mat

	@Value("${jwt.expiration}")
	private long expiration; // thoi han token

	private SecretKey getSigningKey() {

		byte[] keyBytes = Decoders.BASE64.decode(secret);

		return Keys.hmacShaKeyFor(keyBytes);
	}

	// Lay tat ca permission cua account
	private List<String> getPermissions(Account account) {

		return account.getPermissionGroups().stream()

				// Moi group co nhieu permission
				// flatMap dung de gom tat ca permission cua cac group lai
				.flatMap(group -> group.getPermissions().stream())

				// Tu Permission object chi lay ten
				// VD: BOOK_VIEW, BOOK_CREATE,...
				.map(Permission::getName)

				// Neu account nam trong nhieu group
				// ma bi trung permission thi chi giu 1
				.distinct()

				.toList();
	}

	// Tao JWT
	public String generateToken(Account account) {

		// Lay permission cua account
		List<String> permissions = getPermissions(account);

		return Jwts.builder()

				// Token nay cua account nao
				.subject(account.getEmail())

				// Tam thoi van giu role
				// de code cu chua bi vo
				.claim("role", account.getRole().name())

				// Moi: them danh sach permission vao JWT
				.claim("permissions", permissions)

				// Thoi diem tao token
				.issuedAt(new Date())

				// Thoi diem token het han
				.expiration(new Date(System.currentTimeMillis() + expiration))

				// Ky token bang secret key
				.signWith(getSigningKey())

				.compact();
	}

	// Lay tat ca claim ben trong JWT
	private Claims extractAllClaims(String token) {

		return Jwts.parser()

				.verifyWith(getSigningKey())

				.build()

				.parseSignedClaims(token)

				.getPayload();
	}

	// Lay email
	public String extractEmail(String token) {

		return extractAllClaims(token).getSubject();
	}

	// Tam thoi van giu ham nay
	// Filter cu cua ban co the van dang dung
	public String extractRole(String token) {

		return extractAllClaims(token).get("role", String.class);
	}

	// Moi: lay danh sach permission trong JWT
	public List<String> extractPermissions(String token) {

		Object permissions = extractAllClaims(token).get("permissions");

		if (permissions instanceof List<?>) {

			List<?> list = (List<?>) permissions;

			return list.stream().map(String::valueOf).toList();
		}

		return List.of();
	}

	// Kiem tra token con han hay khong
	public boolean isTokenValid(String token) {

		Date expirationDate = extractAllClaims(token).getExpiration();

		return expirationDate.after(new Date());
	}
}