"""
FastAPI router for ML predictions.

Location: backend/buffr_ai/api/ml_endpoint.py
Purpose: Expose ML models via REST API endpoints for real-time predictions.
"""

from typing import Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from buffr_ai.ml_service import (
    MLService,
    MLModelType,
    get_ml_service,
    MLPredictionResult
)

router = APIRouter(prefix="/api/ml", tags=["ml"])


# Request/Response Models
class FraudDetectionRequest(BaseModel):
    """Request schema for fraud detection."""
    amount: float = Field(..., description="Transaction amount")
    hour_of_day: int = Field(..., ge=0, le=23, description="Hour of transaction (0-23)")
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)")
    transaction_frequency: int = Field(..., description="Number of transactions in last 24h")
    avg_transaction_amount: float = Field(..., description="Average transaction amount")
    distance_from_home: float = Field(..., description="Distance from home location (km)")
    device_score: float = Field(..., ge=0, le=1, description="Device trust score (0-1)")
    account_age_days: int = Field(..., description="Account age in days")
    num_failed_attempts: int = Field(..., description="Failed login attempts")
    velocity_1h: int = Field(..., description="Transaction count in last hour")
    velocity_24h: int = Field(..., description="Transaction count in last 24h")
    merchant_category: int = Field(..., description="Merchant category code")
    country_risk_score: float = Field(..., ge=0, le=1, description="Country risk score")


class CreditScoringRequest(BaseModel):
    """Request schema for credit scoring."""
    monthly_income: float = Field(..., description="Monthly income")
    transaction_count: int = Field(..., description="Monthly transaction count")
    avg_balance: float = Field(..., description="Average account balance")
    credit_utilization: float = Field(..., ge=0, le=1, description="Credit utilization ratio")
    payment_history: float = Field(..., ge=0, le=1, description="Payment history score")
    debt_to_income: float = Field(..., description="Debt to income ratio")
    employment_length: int = Field(..., description="Employment length in months")
    num_credit_lines: int = Field(..., description="Number of credit lines")
    num_inquiries: int = Field(..., description="Number of credit inquiries")
    loan_amount: float = Field(..., description="Requested loan amount")
    loan_term: int = Field(..., description="Loan term in months")
    interest_rate: float = Field(..., description="Interest rate")


class ChurnPredictionRequest(BaseModel):
    """Request schema for churn prediction."""
    days_inactive: int = Field(..., description="Days since last transaction")
    transaction_count_change: float = Field(..., description="Change in transaction count")
    avg_amount_change: float = Field(..., description="Change in average amount")
    support_tickets: int = Field(..., description="Number of support tickets")
    app_login_frequency: int = Field(..., description="App login frequency per month")
    num_beneficiaries: int = Field(..., description="Number of beneficiaries")
    voucher_usage_rate: float = Field(..., ge=0, le=1, description="Voucher usage rate")


class SpendingAnalysisRequest(BaseModel):
    """Request schema for spending analysis."""
    monthly_spending: float = Field(..., description="Total monthly spending")
    transaction_count: int = Field(..., description="Monthly transaction count")
    avg_transaction_amount: float = Field(..., description="Average transaction amount")
    spending_variance: float = Field(..., description="Spending variance")
    merchant_diversity: int = Field(..., description="Number of unique merchants")
    category_distribution: Dict[str, float] = Field(..., description="Spending by category")
    time_of_day_distribution: Dict[str, float] = Field(..., description="Spending by time of day")


class NPSScoringRequest(BaseModel):
    """Request schema for NPS scoring."""
    transaction_satisfaction: float = Field(..., ge=0, le=10, description="Transaction satisfaction")
    app_rating: float = Field(..., ge=0, le=10, description="App rating")
    support_rating: float = Field(..., ge=0, le=10, description="Support rating")
    feature_usage_count: int = Field(..., description="Number of features used")
    response_time_avg: float = Field(..., description="Average response time (seconds)")


class DigitalAdoptionRequest(BaseModel):
    """Request schema for digital adoption prediction."""
    app_sessions_per_week: int = Field(..., description="App sessions per week")
    feature_adoption_count: int = Field(..., description="Number of features adopted")
    avg_session_duration: float = Field(..., description="Average session duration (minutes)")
    last_login_days_ago: int = Field(..., description="Days since last login")
    push_notification_response: float = Field(..., ge=0, le=1, description="Push notification response rate")


class BeneficiarySegmentationRequest(BaseModel):
    """Request schema for beneficiary segmentation."""
    transaction_count: int = Field(..., description="Monthly transaction count")
    avg_send_amount: float = Field(..., description="Average send amount")
    num_beneficiaries: int = Field(..., description="Number of beneficiaries")
    frequency_variance: float = Field(..., description="Frequency variance")
    recency_days: int = Field(..., description="Days since last transaction")


class VoucherForecastRequest(BaseModel):
    """Request schema for voucher redemption forecasting."""
    voucher_age_days: int = Field(..., description="Voucher age in days")
    initial_amount: float = Field(..., description="Initial voucher amount")
    remaining_amount: float = Field(..., description="Remaining voucher amount")
    beneficiary_count: int = Field(..., description="Number of linked beneficiaries")
    prior_redemption_rate: float = Field(..., ge=0, le=1, description="Prior redemption rate")
    merchant_availability_score: float = Field(..., ge=0, le=1, description="Merchant availability")


class AgentDemandRequest(BaseModel):
    """Request schema for agent demand forecasting."""
    location: str = Field(..., description="Location code")
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week")
    is_payday: bool = Field(..., description="Is payday")
    is_holiday: bool = Field(..., description="Is holiday")
    historical_demand: List[float] = Field(..., description="Historical demand data")


class ExpiryRiskRequest(BaseModel):
    """Request schema for voucher expiry risk."""
    days_until_expiry: int = Field(..., description="Days until voucher expires")
    voucher_value: float = Field(..., description="Voucher value")
    redemption_history_rate: float = Field(..., ge=0, le=1, description="Past redemption rate")
    beneficiary_engagement: float = Field(..., ge=0, le=1, description="Beneficiary engagement score")
    notification_responsiveness: float = Field(..., ge=0, le=1, description="Notification responsiveness")


class TransactionClassificationRequest(BaseModel):
    """Request schema for transaction classification."""
    amount: float = Field(..., description="Transaction amount")
    merchant_category: int = Field(..., description="Merchant category code")
    hour_of_day: int = Field(..., ge=0, le=23, description="Hour of transaction")
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week")
    device_type: int = Field(..., description="Device type")
    location_type: int = Field(..., description="Location type")
    account_age_days: int = Field(..., description="Account age in days")


class MLPredictionResponse(BaseModel):
    """Standard response for ML predictions."""
    success: bool
    model: str
    prediction: Any
    confidence: float
    risk_level: Optional[str] = None
    recommendations: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


from typing import Optional


@router.get("/health")
async def ml_health():
    """Check ML service health status."""
    service = get_ml_service()
    status = service.get_model_status()
    return {
        "status": "healthy" if status["initialized"] else "initializing",
        "models": status["models"],
        "models_loaded": status["models_available"]
    }


@router.get("/models")
async def list_models():
    """List all available ML models."""
    service = get_ml_service()
    return {
        "models": service.get_available_models()
    }


@router.post("/fraud-detect", response_model=MLPredictionResponse)
async def detect_fraud(req: FraudDetectionRequest):
    """Detect fraud for a transaction."""
    service = get_ml_service()
    try:
        result = service.predict(MLModelType.FRAUD_DETECT, req.dict())
        return MLPredictionResponse(
            success=True,
            model=result.model,
            prediction=result.prediction,
            confidence=result.confidence,
            risk_level=result.risk_level,
            recommendations=result.recommendations,
            metadata=result.metadata
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/credit-score", response_model=MLPredictionResponse)
async def calculate_credit_score(req: CreditScoringRequest):
    """Calculate credit score for a user."""
    service = get_ml_service()
    try:
        result = service.predict(MLModelType.CREDIT_SCORING, req.dict())
        return MLPredictionResponse(
            success=True,
            model=result.model,
            prediction=result.prediction,
            confidence=result.confidence,
            risk_level=result.risk_level,
            recommendations=result.recommendations,
            metadata=result.metadata
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/churn-predict", response_model=MLPredictionResponse)
async def predict_churn(req: ChurnPredictionRequest):
    """Predict user churn probability."""
    service = get_ml_service()
    try:
        result = service.predict(MLModelType.CHURN_PREDICTION, req.dict())
        return MLPredictionResponse(
            success=True,
            model=result.model,
            prediction=result.prediction,
            confidence=result.confidence,
            risk_level=result.risk_level,
            recommendations=result.recommendations,
            metadata=result.metadata
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/spending-analyze", response_model=MLPredictionResponse)
async def analyze_spending(req: SpendingAnalysisRequest):
    """Analyze spending patterns."""
    service = get_ml_service()
    try:
        result = service.predict(MLModelType.SPENDING_ANALYSIS, req.dict())
        return MLPredictionResponse(
            success=True,
            model=result.model,
            prediction=result.prediction,
            confidence=result.confidence,
            risk_level=result.risk_level,
            recommendations=result.recommendations,
            metadata=result.metadata
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/nps-score", response_model=MLPredictionResponse)
async def predict_nps(req: NPSScoringRequest):
    """Predict NPS score."""
    service = get_ml_service()
    try:
        result = service.predict(MLModelType.NPS_SCORING, req.dict())
        return MLPredictionResponse(
            success=True,
            model=result.model,
            prediction=result.prediction,
            confidence=result.confidence,
            metadata=result.metadata
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/digital-adoption", response_model=MLPredictionResponse)
async def predict_digital_adoption(req: DigitalAdoptionRequest):
    """Predict digital adoption score."""
    service = get_ml_service()
    try:
        result = service.predict(MLModelType.DIGITAL_ADOPTION, req.dict())
        return MLPredictionResponse(
            success=True,
            model=result.model,
            prediction=result.prediction,
            confidence=result.confidence,
            risk_level=result.risk_level,
            recommendations=result.recommendations,
            metadata=result.metadata
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/beneficiary-segment", response_model=MLPredictionResponse)
async def segment_beneficiary(req: BeneficiarySegmentationRequest):
    """Segment beneficiary for targeted campaigns."""
    service = get_ml_service()
    try:
        result = service.predict(MLModelType.BENEFICIARY_SEGMENTATION, req.dict())
        return MLPredictionResponse(
            success=True,
            model=result.model,
            prediction=result.prediction,
            confidence=result.confidence,
            metadata=result.metadata
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/voucher-forecast", response_model=MLPredictionResponse)
async def forecast_voucher_redemption(req: VoucherForecastRequest):
    """Forecast voucher redemption rate."""
    service = get_ml_service()
    try:
        result = service.predict(MLModelType.VOUCHER_FORECAST, req.dict())
        return MLPredictionResponse(
            success=True,
            model=result.model,
            prediction=result.prediction,
            confidence=result.confidence,
            metadata=result.metadata
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agent-demand", response_model=MLPredictionResponse)
async def forecast_agent_demand(req: AgentDemandRequest):
    """Forecast agent demand."""
    service = get_ml_service()
    try:
        result = service.predict(MLModelType.AGENT_DEMAND, req.dict())
        return MLPredictionResponse(
            success=True,
            model=result.model,
            prediction=result.prediction,
            confidence=result.confidence,
            metadata=result.metadata
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/expiry-risk", response_model=MLPredictionResponse)
async def assess_expiry_risk(req: ExpiryRiskRequest):
    """Assess voucher expiry risk."""
    service = get_ml_service()
    try:
        result = service.predict(MLModelType.EXPIRY_RISK, req.dict())
        return MLPredictionResponse(
            success=True,
            model=result.model,
            prediction=result.prediction,
            confidence=result.confidence,
            risk_level=result.risk_level,
            recommendations=result.recommendations,
            metadata=result.metadata
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classify-transaction", response_model=MLPredictionResponse)
async def classify_transaction(req: TransactionClassificationRequest):
    """Classify transaction category."""
    service = get_ml_service()
    try:
        result = service.predict(MLModelType.TRANSACTION_CLASSIFICATION, req.dict())
        return MLPredictionResponse(
            success=True,
            model=result.model,
            prediction=result.prediction,
            confidence=result.confidence,
            metadata=result.metadata
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
