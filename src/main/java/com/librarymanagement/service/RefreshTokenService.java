package com.librarymanagement.service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.RefreshToken;
import com.librarymanagement.exception.UnauthorizedException;
import com.librarymanagement.repository.RefreshTokenRepository;

@Service
public class RefreshTokenService {

	private final RefreshTokenRepository refreshTokenRepository;

	public RefreshTokenService(RefreshTokenRepository refreshTokenRepository) {

		this.refreshTokenRepository = refreshTokenRepository;
	}

	@Transactional
	public RefreshToken createRefreshToken(Account account) {

		// Moi account chi giu 1 refresh token
		refreshTokenRepository.deleteByAccount_Id(account.getId());

		RefreshToken refreshToken = new RefreshToken();

		refreshToken.setToken(UUID.randomUUID().toString());
		refreshToken.setExpiryDate(//
				LocalDateTime.now().plusDays(7));
		refreshToken.setAccount(account);

		return refreshTokenRepository.save(refreshToken);
	}

	@Transactional(readOnly = true)
	public RefreshToken verifyRefreshToken(String token) {

		RefreshToken refreshToken = refreshTokenRepository//
				.findByToken(token)//
				.orElseThrow(() -> new UnauthorizedException(//
						"Refresh token không hợp lệ!"));//

		if (refreshToken.getExpiryDate()//
				.isBefore(LocalDateTime.now())) {

			throw new UnauthorizedException(//
					"Refresh token đã hết hạn, vui lòng đăng nhập lại!");
		}

		return refreshToken;
	}

	@Transactional
	public void deleteByAccountId(Long accountId) {

		refreshTokenRepository.deleteByAccount_Id(accountId);
	}
}