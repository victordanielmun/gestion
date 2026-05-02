FROM golang:1.23-alpine

WORKDIR /app

# Instalar Air para hot reload
RUN go install github.com/cosmtrek/air@v1.52.0

COPY go.mod ./
RUN go mod download

COPY . .

EXPOSE 8080

CMD ["air", "-c", ".air.toml"]
