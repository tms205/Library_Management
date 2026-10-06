package com.librarymanagement.security;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

@Service
public class TokenBlacklistService {

	private final Set<String> blackListedTokens = ConcurrentHashMap.newKeySet();// neu nhieu request thi cai nay no an
																				// toan
	// xuly multi thread

	public void blacklist(String token) {
		blackListedTokens.add(token);
	}

	public boolean isBlacklisted(String token) {
		return blackListedTokens.contains(token);
	}

}
