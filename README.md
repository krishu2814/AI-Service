# 🤖 AI & Intelligent Shopping Agent Microservice

A production-grade, decoupled **GenAI & Agent Microservice** built for the Ecommerce Microservices Ecosystem.

---

## 🌟 Overview & Architectural Philosophy

The **AI Service** operates as an intelligent reasoning and retrieval layer on top of the ecommerce ecosystem. It is architected around **strict service isolation and zero core transaction coupling**:

1. **Zero Core-Transaction Impact**: The critical order, inventory reservation, and payment saga functions independently. If the AI Service or upstream LLM provider is offline, the ecommerce checkout pipeline remains **100% operational**.
2. **Database-per-Service Isolation**: AI Service maintains its own dedicated MongoDB database (`ecommerce_ai`) for session history and memory. It **never** directly queries product, order, or inventory databases.
3. **Grounded Tool Calling**: All product recommendations, stock verifications, and order diagnostics are performed via authorized REST client tools against domain microservices, eliminating hallucinations.

---

## 🏗️ Architecture Diagram

```
                              ┌───────────────────────────┐
                              │    API GATEWAY (:5014)    │
                              │  - Rate Limiting (Redis)  │
                              │  - JWT Verification       │
                              │  - Correlation Tracing    │
                              └─────────────┬─────────────┘
                                            │
                                HTTP POST /api/v1/ai/*
                                            │
                                            ▼
                           ┌─────────────────────────────────┐
                           │     AI SERVICE (:5018)          │
                           │                                 │
                           │  ┌───────────────────────────┐  │
                           │  │     Express Controller    │  │
                           │  └─────────────┬─────────────┘  │
                           │                │                │
                           │  ┌─────────────▼─────────────┐  │
                           │  │   AI Orchestrator / LLM   │  │
                           │  │       Service Layer       │  │
                           │  └─────────────┬─────────────┘  │
                           │                │                │
                           │  ┌─────────────▼─────────────┐  │
                           │  │   Dedicated MongoDB DB    │  │
                           │  │   (ecommerce_ai)          │  │
                           │  └───────────────────────────┘  │
                           └────────────────┬────────────────┘
                                            │
             ┌──────────────────────────────┼──────────────────────────────┐
             │ HTTP (Read-Only Tools)       │ HTTP (Read-Only Tools)       │ HTTP (Read-Only Tools)
             ▼                              ▼                              ▼
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│  PRODUCT SERVICE (:5009)│    │INVENTORY SERVICE (:5016)│    │  ORDER SERVICE (:5012)  │
└─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
```

---

## 🚀 Key Features

- **🤖 Intelligent Conversational Shopping Agent**: Multi-turn dialogue with memory that searches products and verifies warehouse stock in real time.
- **🎯 Personalized Recommendations**: Order history and cart analysis for contextual product pairing.
- **🔍 Semantic Vector Search**: Natural language product matching based on intent and usage.
- **🕵️ Cross-Service Order Diagnostics**: Read-only troubleshooting of stuck orders across Order, Inventory, and Payment states.
- **📚 Policy RAG Knowledge Base**: Verified store policy retrieval with source citations.
- **🔒 Distributed Correlation Tracing**: End-to-end trace tracking with `x-correlation-id`.

---

## 📡 API Endpoints

### Foundation & Diagnostics (Public)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Root container health check |
| `GET` | `/api/v1/ping` | Service status and timestamp ping |
| `GET` | `/api/v1/health` | Comprehensive microservice diagnostics |

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (v20+), Express.js
- **Database**: MongoDB & Mongoose (`ecommerce_ai`)
- **HTTP Client**: Axios with correlation header interceptors
- **Authentication**: JWT (JSON Web Tokens)
- **Containerization**: Docker & Docker Compose
