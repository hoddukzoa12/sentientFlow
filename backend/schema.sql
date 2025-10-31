-- SentientFlow Database Schema
-- PostgreSQL 16+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Connections Table
-- ============================================================================
-- Stores encrypted API keys for various AI providers
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,  -- Will be used when authentication is added
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('openai', 'anthropic', 'gemini', 'grok')),
  name VARCHAR(255) NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  config JSONB DEFAULT '{}',  -- Additional settings: {model, temperature, etc}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure unique connection names per user/provider
  UNIQUE(user_id, provider, name)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_connections_user_provider
ON connections(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_connections_active
ON connections(is_active) WHERE is_active = true;

-- ============================================================================
-- Workflows Table
-- ============================================================================
-- Stores workflow definitions (nodes, edges, variables)
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,  -- Will be used when authentication is added
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  definition JSONB NOT NULL,  -- {nodes: [...], edges: [...], variables: [...]}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_workflows_user
ON workflows(user_id);

CREATE INDEX IF NOT EXISTS idx_workflows_updated
ON workflows(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflows_name
ON workflows(name);

-- GIN index for JSONB queries (optional, for advanced queries)
CREATE INDEX IF NOT EXISTS idx_workflows_definition
ON workflows USING GIN (definition);

-- ============================================================================
-- Update Timestamp Trigger
-- ============================================================================
-- Automatically update updated_at column

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
