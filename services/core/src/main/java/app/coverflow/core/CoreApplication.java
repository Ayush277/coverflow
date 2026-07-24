package app.coverflow.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * CoverFlow Core — Benefit Knowledge + Decision engines as a standalone
 * business service. The Node gateway routes /api/core/** here in the
 * docker-compose production topology; local dev uses the gateway's
 * embedded engines (same contract, verified by shared JSON fixtures).
 */
@SpringBootApplication
public class CoreApplication {
    public static void main(String[] args) {
        SpringApplication.run(CoreApplication.class, args);
    }
}
