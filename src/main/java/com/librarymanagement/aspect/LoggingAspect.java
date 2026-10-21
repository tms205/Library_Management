package com.librarymanagement.aspect;

import java.util.Arrays;
import java.util.stream.Collectors;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Aspect
@Component
public class LoggingAspect {

	@Around("execution(* com.librarymanagement.controller..*(..))")
	public Object logRequestAndResponse(ProceedingJoinPoint joinPoint) throws Throwable {

		long startTime = System.currentTimeMillis();

		MethodSignature signature = (MethodSignature) joinPoint.getSignature();

		String className = signature.getDeclaringType().getSimpleName();
		String methodName = signature.getName();

		HttpServletRequest request = getCurrentRequest();

		String httpMethod = request != null ? request.getMethod() : "UNKNOWN";
		String requestUri = request != null ? request.getRequestURI() : "UNKNOWN";

		String requestData = isSensitiveRequest(requestUri) ? "[SENSITIVE DATA HIDDEN]"
				: formatArguments(joinPoint.getArgs());

		log.info("REQUEST -> {} {} | {}.{} | Data: {}", httpMethod, requestUri, className, methodName, requestData);

		try {

			Object result = joinPoint.proceed();

			long executionTime = System.currentTimeMillis() - startTime;

			String responseData = isSensitiveRequest(requestUri) ? "[SENSITIVE DATA HIDDEN]" : formatResponse(result);

			log.info("RESPONSE <- {} {} | {}.{} | Time: {} ms | Data: {}", httpMethod, requestUri, className,
					methodName, executionTime, responseData);

			return result;

		} catch (Exception e) {

			long executionTime = System.currentTimeMillis() - startTime;

			log.error("ERROR <- {} {} | {}.{} | Time: {} ms | Message: {}", httpMethod, requestUri, className,
					methodName, executionTime, e.getMessage());

			throw e;
		}
	}

	private HttpServletRequest getCurrentRequest() {

		Object requestAttributes = RequestContextHolder.getRequestAttributes();

		if (requestAttributes instanceof ServletRequestAttributes) {

			ServletRequestAttributes attributes = (ServletRequestAttributes) requestAttributes;

			return attributes.getRequest();
		}

		return null;
	}

	private String formatArguments(Object[] args) {

		if (args == null || args.length == 0) {
			return "No request body";
		}

		return Arrays.stream(args).filter(arg -> !(arg instanceof ServletRequest))
				.filter(arg -> !(arg instanceof ServletResponse)).filter(arg -> !(arg instanceof Authentication))
				.map(this::formatArgument).collect(Collectors.joining(", "));
	}

	private String formatArgument(Object arg) {

		if (arg == null) {
			return "null";
		}

		if (arg instanceof MultipartFile) {

			MultipartFile file = (MultipartFile) arg;

			return "MultipartFile{name=" + file.getOriginalFilename() + ", size=" + file.getSize() + " bytes}";
		}

		return String.valueOf(arg);
	}

	private String formatResponse(Object result) {

		if (result == null) {
			return "No response body";
		}

		if (result instanceof ResponseEntity<?>) {

			ResponseEntity<?> responseEntity = (ResponseEntity<?>) result;

			return "status=" + responseEntity.getStatusCode() + ", body=" + String.valueOf(responseEntity.getBody());
		}

		return String.valueOf(result);
	}

	private boolean isSensitiveRequest(String uri) {

		if (uri == null) {
			return false;
		}

		return uri.startsWith("/auth");
	}
}