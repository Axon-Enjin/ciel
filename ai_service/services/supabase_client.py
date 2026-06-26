"""
Supabase client for AI service database operations.

Uses service role key for server-side operations with full access.
Implements connection pooling and error handling per SDD §4.
"""

from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from postgrest.exceptions import APIError
import logging

from ai_service.config import settings

logger = logging.getLogger(__name__)


class SupabaseClient:
    """
    Supabase client wrapper with connection management.
    
    Uses service role key for bypassing RLS in AI service context.
    All operations are server-side with full database access.
    """
    
    _instance: Optional["SupabaseClient"] = None
    _client: Optional[Client] = None
    
    def __new__(cls) -> "SupabaseClient":
        """Singleton pattern for connection pooling."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Defer client creation until first use.

        Building the client is delayed so that importing this module (and the
        FastAPI app) does not require valid Supabase credentials. This keeps the
        service importable for unit tests and local boot, while real DB calls
        still initialize a connection lazily on first access.
        """
        # Intentionally no eager `create_client` here — see `client` property.

    @property
    def client(self) -> Client:
        """Get the underlying Supabase client, creating it on first access."""
        if self._client is None:
            try:
                self._client = create_client(
                    supabase_url=settings.SUPABASE_URL,
                    supabase_key=settings.SUPABASE_SERVICE_KEY,
                )
                logger.info("Supabase client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                raise
        return self._client
    
    async def health_check(self) -> bool:
        """
        Check database connectivity.
        
        Returns:
            True if connection is healthy, False otherwise
        """
        try:
            # Simple query to test connection
            result = self.client.table("organizations").select("id").limit(1).execute()
            return True
        except Exception as e:
            logger.error(f"Supabase health check failed: {e}")
            return False
    
    # Evidence Sources Operations
    
    def get_evidence_sources(
        self,
        tier: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Retrieve evidence sources from corpus.
        
        Args:
            tier: Filter by evidence tier (T1, T2, T3, T4)
            limit: Maximum number of sources to return
            
        Returns:
            List of evidence source records
        """
        try:
            query = self.client.table("evidence_sources").select("*")
            
            if tier:
                query = query.eq("tier", tier)
            
            result = query.limit(limit).execute()
            return result.data
        except APIError as e:
            logger.error(f"Failed to retrieve evidence sources: {e}")
            raise
    
    def insert_evidence_source(self, source_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert a new evidence source into the corpus.
        
        Args:
            source_data: Evidence source data including title, content, tier, etc.
            
        Returns:
            Inserted evidence source record
        """
        try:
            result = self.client.table("evidence_sources").insert(source_data).execute()
            return result.data[0]
        except APIError as e:
            logger.error(f"Failed to insert evidence source: {e}")
            raise
    
    def bulk_insert_evidence_sources(
        self,
        sources: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Bulk insert evidence sources for seeding.
        
        Args:
            sources: List of evidence source data
            
        Returns:
            List of inserted evidence source records
        """
        try:
            result = self.client.table("evidence_sources").insert(sources).execute()
            logger.info(f"Bulk inserted {len(result.data)} evidence sources")
            return result.data
        except APIError as e:
            logger.error(f"Failed to bulk insert evidence sources: {e}")
            raise
    
    # Theory of Change Operations
    
    def insert_toc(self, toc_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert a new Theory of Change.
        
        Args:
            toc_data: ToC data including project_id, graph, status, etc.
            
        Returns:
            Inserted ToC record
        """
        try:
            result = self.client.table("theories_of_change").insert(toc_data).execute()
            return result.data[0]
        except APIError as e:
            logger.error(f"Failed to insert ToC: {e}")
            raise
    
    def update_toc(self, toc_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update an existing Theory of Change.
        
        Args:
            toc_id: ToC UUID
            updates: Fields to update
            
        Returns:
            Updated ToC record
        """
        try:
            result = (
                self.client.table("theories_of_change")
                .update(updates)
                .eq("id", toc_id)
                .execute()
            )
            return result.data[0]
        except APIError as e:
            logger.error(f"Failed to update ToC {toc_id}: {e}")
            raise
    
    def get_toc(self, toc_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a Theory of Change by ID.
        
        Args:
            toc_id: ToC UUID
            
        Returns:
            ToC record or None if not found
        """
        try:
            result = (
                self.client.table("theories_of_change")
                .select("*")
                .eq("id", toc_id)
                .single()
                .execute()
            )
            return result.data
        except APIError as e:
            logger.error(f"Failed to retrieve ToC {toc_id}: {e}")
            return None
    
    def lock_toc(self, toc_id: str) -> Dict[str, Any]:
        """
        Lock a Theory of Change after critique acknowledgment.
        
        Args:
            toc_id: ToC UUID
            
        Returns:
            Updated ToC record with locked status
        """
        try:
            result = (
                self.client.table("theories_of_change")
                .update({"status": "locked"})
                .eq("id", toc_id)
                .execute()
            )
            logger.info(f"ToC {toc_id} locked successfully")
            return result.data[0]
        except APIError as e:
            logger.error(f"Failed to lock ToC {toc_id}: {e}")
            raise
    
    # ToC Assumptions Operations
    
    def insert_toc_assumptions(
        self,
        assumptions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Insert ToC assumptions for M&E tracking.
        
        Args:
            assumptions: List of assumption data with toc_id, text, indicators
            
        Returns:
            List of inserted assumption records
        """
        try:
            result = self.client.table("toc_assumptions").insert(assumptions).execute()
            return result.data
        except APIError as e:
            logger.error(f"Failed to insert ToC assumptions: {e}")
            raise
    
    # ToC Critiques Operations
    
    def insert_toc_critique(self, critique_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert a ToC critique from adversarial review.
        
        Args:
            critique_data: Critique data including toc_id, critique_text, severity
            
        Returns:
            Inserted critique record
        """
        try:
            result = self.client.table("toc_critiques").insert(critique_data).execute()
            return result.data[0]
        except APIError as e:
            logger.error(f"Failed to insert ToC critique: {e}")
            raise
    
    def get_toc_critiques(self, toc_id: str) -> List[Dict[str, Any]]:
        """
        Retrieve all critiques for a ToC.
        
        Args:
            toc_id: ToC UUID
            
        Returns:
            List of critique records
        """
        try:
            result = (
                self.client.table("toc_critiques")
                .select("*")
                .eq("toc_id", toc_id)
                .order("created_at", desc=False)
                .execute()
            )
            return result.data
        except APIError as e:
            logger.error(f"Failed to retrieve critiques for ToC {toc_id}: {e}")
            raise
    
    def acknowledge_critique_simple(self, critique_id: str) -> Dict[str, Any]:
        """Mark a failure prompt as acknowledged (RFC-001 lock gate)."""
        try:
            result = (
                self.client.table("toc_critiques")
                .update({"acknowledged": True})
                .eq("id", critique_id)
                .execute()
            )
            return result.data[0]
        except APIError as e:
            logger.error(f"Failed to acknowledge critique {critique_id}: {e}")
            raise

    def acknowledge_critique(
        self,
        critique_id: str,
        user_id: str,
        response: str
    ) -> Dict[str, Any]:
        """
        Record user acknowledgment of a critique.
        
        Args:
            critique_id: Critique UUID
            user_id: User UUID acknowledging the critique
            response: User's response to the critique
            
        Returns:
            Updated critique record
        """
        try:
            result = (
                self.client.table("toc_critiques")
                .update({
                    "acknowledged_at": "now()",
                    "acknowledged_by": user_id,
                    "user_response": response
                })
                .eq("id", critique_id)
                .execute()
            )
            return result.data[0]
        except APIError as e:
            logger.error(f"Failed to acknowledge critique {critique_id}: {e}")
            raise
    
    # Project Operations
    
    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a project by ID.
        
        Args:
            project_id: Project UUID
            
        Returns:
            Project record or None if not found
        """
        try:
            result = (
                self.client.table("projects")
                .select("*")
                .eq("id", project_id)
                .single()
                .execute()
            )
            return result.data
        except APIError as e:
            logger.error(f"Failed to retrieve project {project_id}: {e}")
            return None

    # M&E / signals (RFC-002)

    def get_locked_toc_for_project(self, project_id: str) -> dict | None:
        try:
            result = (
                self.client.table("theories_of_change")
                .select("id, status, version")
                .eq("project_id", project_id)
                .eq("status", "locked")
                .order("version", desc=True)
                .limit(1)
                .execute()
            )
            rows = result.data or []
            return rows[0] if rows else None
        except APIError as e:
            logger.error(f"Failed to get locked ToC for project {project_id}: {e}")
            return None

    def get_project_assumptions(self, project_id: str) -> List[Dict[str, Any]]:
        toc = self.get_locked_toc_for_project(project_id)
        if not toc:
            return []
        try:
            result = (
                self.client.table("toc_assumptions")
                .select("id, statement, indicator, threshold")
                .eq("toc_id", toc["id"])
                .execute()
            )
            return result.data or []
        except APIError as e:
            logger.error(f"Failed to get assumptions for project {project_id}: {e}")
            return []

    def get_indicator_points(
        self, project_id: str, *, limit: int = 50
    ) -> List[Dict[str, Any]]:
        try:
            result = (
                self.client.table("indicator_points")
                .select("indicator, value, observed_at, assumption_id")
                .eq("project_id", project_id)
                .order("observed_at", desc=False)
                .limit(limit)
                .execute()
            )
            return result.data or []
        except APIError as e:
            logger.error(f"Failed to get indicator points for {project_id}: {e}")
            return []

    def insert_indicator_point(self, row: Dict[str, Any]) -> Dict[str, Any]:
        try:
            result = self.client.table("indicator_points").insert(row).execute()
            return result.data[0]
        except APIError as e:
            logger.error(f"Failed to insert indicator point: {e}")
            raise

    def insert_field_entry(self, row: Dict[str, Any]) -> Dict[str, Any]:
        try:
            result = self.client.table("field_entries").insert(row).execute()
            return result.data[0]
        except APIError as e:
            logger.error(f"Failed to insert field entry: {e}")
            raise

    def insert_signal(self, row: Dict[str, Any]) -> Dict[str, Any]:
        try:
            result = self.client.table("signals").insert(row).execute()
            return result.data[0]
        except APIError as e:
            logger.error(f"Failed to insert signal: {e}")
            raise

    def get_project_signals(
        self, project_id: str, *, limit: int = 10
    ) -> List[Dict[str, Any]]:
        try:
            result = (
                self.client.table("signals")
                .select("*")
                .eq("project_id", project_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return result.data or []
        except APIError as e:
            logger.error(f"Failed to get signals for {project_id}: {e}")
            return []

    def has_recent_signal(
        self,
        project_id: str,
        assumption_id: str,
        signal_type: str,
        *,
        hours: int = 24,
    ) -> bool:
        try:
            from datetime import datetime, timedelta, timezone

            since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
            result = (
                self.client.table("signals")
                .select("id")
                .eq("project_id", project_id)
                .eq("assumption_id", assumption_id)
                .eq("signal_type", signal_type)
                .gte("created_at", since)
                .limit(1)
                .execute()
            )
            return bool(result.data)
        except APIError as e:
            logger.error(f"Failed to check recent signal: {e}")
            return False


# Global instance
supabase_client = SupabaseClient()

# Made with Bob
