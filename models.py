from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Funcionario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    cpf = db.Column(db.String(20), nullable=False, unique=True)
    imagem = db.Column(db.String(200), nullable=False)

class EPI(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    ca = db.Column(db.String(50), nullable=False)
    validade = db.Column(db.Date, nullable=True)

class Requisicao(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome_funcionario = db.Column(db.String(100), nullable=False)
    cpf_funcionario = db.Column(db.String(20), nullable=False)
    epis = db.Column(db.String(500), nullable=False)
    data = db.Column(db.String(50), nullable=False)
    foto_reconhecimento = db.Column(db.String(200), nullable=False)

def registrar_requisicao(funcionario_id, epis, data, imagem, nome, cpf):
    requisicao = Requisicao(
        nome_funcionario=nome,
        cpf_funcionario=cpf,
        epis=','.join(epis),
        data=data,
        foto_reconhecimento=imagem
    )
    db.session.add(requisicao)
    db.session.commit()
