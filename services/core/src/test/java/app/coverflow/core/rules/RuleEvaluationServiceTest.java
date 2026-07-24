package app.coverflow.core.rules;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RuleEvaluationServiceTest {

    private RuleEvaluationService service;

    @BeforeEach
    void setUp() {
        BenefitRule rule = new BenefitRule();
        rule.setId("r1");
        rule.setName("Purchase Protection · Platinum");
        rule.setBenefitType("Purchase Protection");
        rule.setDescription("test");
        rule.setCardTiers("[\"PLATINUM\"]");
        rule.setCategories("[\"ELECTRONICS\"]");
        rule.setCountries("[\"*\"]");
        rule.setMinAmount(new BigDecimal("2000"));
        rule.setCoverageDays(90);
        rule.setCoverageLimit(new BigDecimal("100000"));
        rule.setClaimWindowDays(120);
        rule.setExclusions("[\"GreyMarket\"]");

        BenefitRuleRepository repo = Mockito.mock(BenefitRuleRepository.class);
        Mockito.when(repo.findByActiveTrue()).thenReturn(List.of(rule));
        service = new RuleEvaluationService(repo);
    }

    @Test
    void matchesEligibleElectronicsPurchase() {
        var matches = service.evaluate(new RuleEvaluationService.Transaction(
                "Apple Store", "ELECTRONICS", "IN", "PLATINUM", new BigDecimal("189000")));
        assertEquals(1, matches.size());
        assertTrue(matches.get(0).trace().stream().allMatch(RuleEvaluationService.TraceStep::pass));
    }

    @Test
    void rejectsWrongTier() {
        var matches = service.evaluate(new RuleEvaluationService.Transaction(
                "Apple Store", "ELECTRONICS", "IN", "GOLD", new BigDecimal("189000")));
        assertTrue(matches.isEmpty());
    }

    @Test
    void rejectsBelowMinimumAmount() {
        var matches = service.evaluate(new RuleEvaluationService.Transaction(
                "Apple Store", "ELECTRONICS", "IN", "PLATINUM", new BigDecimal("500")));
        assertTrue(matches.isEmpty());
    }

    @Test
    void rejectsExcludedMerchant() {
        var matches = service.evaluate(new RuleEvaluationService.Transaction(
                "GreyMarket Resellers", "ELECTRONICS", "IN", "PLATINUM", new BigDecimal("50000")));
        assertTrue(matches.isEmpty());
    }
}
