package com.librarymanagement.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.librarymanagement.entity.Member;

public interface MemberRepository extends JpaRepository<Member, Long>, //
		JpaSpecificationExecutor<Member> {//

	boolean existsByAccount_Id(Long accountId);
}