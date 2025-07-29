from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Colaborador(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    funcao = db.Column(db.String(100), nullable=False)
    cpf = db.Column(db.String(20), unique=True, nullable=False)
    foto = db.Column(db.String(200))  # Caminho da foto (ex: static/fotos/12345678900.jpg)

class EPI(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    ca = db.Column(db.String(50), nullable=False)

class Requisicao(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome_funcionario = db.Column(db.String(100), nullable=False)
    cpf_funcionario = db.Column(db.String(20), nullable=False)
    epis = db.Column(db.String(300), nullable=False)
    data = db.Column(db.DateTime, default=datetime.utcnow)
    foto = db.Column(db.String(100), nullable=False)  # nome do arquivo salvo da foto capturada
