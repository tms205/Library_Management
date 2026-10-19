package com.librarymanagement.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.librarymanagement.entity.Member;

public interface MemberRepository extends JpaRepository<Member, Long>, //
		JpaSpecificationExecutor<Member> {//

	Optional<Member> findByAccount_Email(String email);

	boolean existsByAccount_Id(Long accountId);
}